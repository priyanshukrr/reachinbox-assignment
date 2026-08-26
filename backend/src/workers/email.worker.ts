import { Worker, Job } from "bullmq";
import { redisConnection } from "../queues/redis";
import prisma from "../db/prisma";
import { sendEmail } from "../services/smtp.service";

interface EmailJobData {
  emailId: string;
  recipient: string;
  subject: string;
  body: string;
}

const concurrency = Number(process.env.WORKER_CONCURRENCY) || 5;

const worker = new Worker<EmailJobData>(
  "email-send",

  async (job: Job<EmailJobData>) => {
    const { emailId, recipient, subject, body } = job.data;

    console.log("📨 Processing email job:", {
      jobId: job.id,
      emailId,
      recipient,
    });

    try {
      // 1. Mark email as PROCESSING
      await prisma.email.update({
        where: {
          id: emailId,
        },
        data: {
          status: "PROCESSING",
          attempts: {
            increment: 1,
          },
        },
      });

      console.log(`🔄 Email ${emailId} status → PROCESSING`);

      // 2. Send actual email through Ethereal SMTP
      const info = await sendEmail({
        recipient,
        subject,
        body,
      });

      console.log(`📧 Email sent through SMTP: ${info.messageId}`);

      // 3. Mark email as SENT and save messageId
      await prisma.email.update({
        where: {
          id: emailId,
        },
        data: {
          status: "SENT",
          sentAt: new Date(),
          messageId: info.messageId,
        },
      });

      console.log(`✅ Email ${emailId} status → SENT`);

      return {
        success: true,
        emailId,
        recipient,
        subject,
        messageId: info.messageId,
      };
    } catch (error) {
      console.error(`❌ Failed to process email ${emailId}:`, error);

      // 4. Mark email as FAILED
      try {
        await prisma.email.update({
          where: {
            id: emailId,
          },
          data: {
            status: "FAILED",
          },
        });

        console.log(`❌ Email ${emailId} status → FAILED`);
      } catch (dbError) {
        console.error(
          `❌ Could not update email ${emailId} to FAILED:`,
          dbError
        );
      }

      throw error;
    }
  },

  {
    connection: redisConnection,
    concurrency,
  }
);

// Job completed
worker.on("completed", (job) => {
  console.log(`✅ Job completed: ${job.id}`);
});

// Job failed
worker.on("failed", (job, error) => {
  console.error(`❌ Job failed: ${job?.id}`, error.message);
});

// Worker error
worker.on("error", (error) => {
  console.error("❌ Worker error:", error);
});

console.log(`📨 Email worker started with concurrency=${concurrency}`);