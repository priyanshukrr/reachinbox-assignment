import { Request, Response } from "express";
import prisma from "../db/prisma";
import { sendEmail } from "../services/smtp.service";

const CRON_SECRET = process.env.CRON_SECRET;
const MAX_BATCH = 20; // process up to 20 emails per cron tick

/**
 * POST /api/cron/process-emails
 *
 * Called every minute by Vercel Cron Jobs.
 * Finds all SCHEDULED emails whose scheduledAt time has arrived
 * and sends them via SMTP — replacing the BullMQ worker on serverless.
 *
 * Protected by CRON_SECRET header to prevent abuse.
 */
export async function processScheduledEmails(req: Request, res: Response) {
  // Verify the request comes from Vercel Cron (or authorized caller)
  if (CRON_SECRET) {
    const authHeader = req.headers["authorization"];
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  }

  const now = new Date();

  // Find emails that are due and still SCHEDULED
  const dueEmails = await prisma.email.findMany({
    where: {
      status: "SCHEDULED",
      scheduledAt: { lte: now },
    },
    take: MAX_BATCH,
    orderBy: { scheduledAt: "asc" },
  });

  if (dueEmails.length === 0) {
    return res.json({ processed: 0, message: "No emails due" });
  }

  const results = await Promise.allSettled(
    dueEmails.map(async (email) => {
      // Mark as PROCESSING
      await prisma.email.update({
        where: { id: email.id },
        data: { status: "PROCESSING", attempts: { increment: 1 } },
      });

      try {
        const info = await sendEmail({
          recipient: email.recipient,
          subject: email.subject,
          body: email.body,
        });

        // Mark as SENT
        await prisma.email.update({
          where: { id: email.id },
          data: {
            status: "SENT",
            sentAt: new Date(),
            messageId: info.messageId,
          },
        });

        return { emailId: email.id, status: "SENT", messageId: info.messageId };
      } catch (err) {
        // Mark as FAILED
        await prisma.email.update({
          where: { id: email.id },
          data: { status: "FAILED" },
        });

        const message = err instanceof Error ? err.message : String(err);
        return { emailId: email.id, status: "FAILED", error: message };
      }
    })
  );

  const summary = results.map((r) =>
    r.status === "fulfilled" ? r.value : { error: r.reason }
  );

  console.log(`Cron processed ${dueEmails.length} email(s):`, summary);

  return res.json({ processed: dueEmails.length, results: summary });
}
