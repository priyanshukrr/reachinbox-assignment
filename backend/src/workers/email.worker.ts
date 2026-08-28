import { Worker, Job } from "bullmq";
import { redisConnection } from "../queues/redis";
import prisma from "../db/prisma";
import { sendEmail } from "../services/smtp.service";

// The worker is only used for local development with Redis.
// On Vercel, emails are processed by the cron endpoint instead.
if (!redisConnection) {
  console.log("No Redis connection — worker not started (using cron on Vercel).");
  process.exit(0);
}

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

    console.log("Processing email job:", {
      jobId: job.id,
      emailId,
      recipient,
    });

    try {
      // 1. Mark email as PROCESSING
      await prisma.email.update({
        where: { id: emailId },
        data: {
          status: "PROCESSING",
          attempts: { increment: 1 },
        },
      });

      // 2. Send actual email through SMTP
      const info = await sendEmail({ recipient, subject, body });

      console.log(`Email sent through SMTP: ${info.messageId}`);

      // 3. Mark email as SENT and save messageId
      await prisma.email.update({
        where: { id: emailId },
        data: {
          status: "SENT",
          sentAt: new Date(),
          messageId: info.messageId,
        },
      });

      return { success: true, emailId, messageId: info.messageId };
    } catch (error) {
      console.error(`Failed to process email ${emailId}:`, error);

      const maxAttempts = job.opts.attempts || 1;
      const currentAttempt = (job.attemptsMade || 0) + 1;

      if (currentAttempt >= maxAttempts) {
        try {
          await prisma.email.update({
            where: { id: emailId },
            data: { status: "FAILED" },
          });
        } catch (dbError) {
          console.error(`Could not update email ${emailId} to FAILED:`, dbError);
        }
      }

      throw error;
    }
  },

  {
    connection: redisConnection,
    concurrency,
  }
);

worker.on("completed", (job) => {
  console.log(`Job completed: ${job.id}`);
});

worker.on("failed", (job, error) => {
  console.error(`Job failed: ${job?.id}`, error.message);
});

worker.on("error", (error) => {
  console.error("Worker error:", error);
});

console.log(`Email worker started with concurrency=${concurrency}`);