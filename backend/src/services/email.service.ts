import prisma from "../db/prisma";
import { emailQueue } from "../queues/email.queue";

export interface ScheduleEmailInput {
  userId: string;
  campaignId: string;
  recipient: string;
  subject: string;
  body: string;
  scheduledAt: Date;
}

export async function scheduleEmail(input: ScheduleEmailInput) {
  // Execute slot calculation and email record creation inside an interactive transaction
  const { email, campaign, finalScheduledAt } = await prisma.$transaction(
    async (tx) => {
      // 1. Find campaign
      const campaign = await tx.campaign.findFirst({
        where: {
          id: input.campaignId,
          userId: input.userId,
        },
      });

      if (!campaign) {
        throw new Error("Campaign not found");
      }

      let finalScheduledAt = new Date(input.scheduledAt);

      // 2. Find the latest email already scheduled in this campaign
      const lastEmail = await tx.email.findFirst({
        where: {
          campaignId: input.campaignId,
          status: {
            in: ["SCHEDULED", "PROCESSING", "SENT"],
          },
        },
        orderBy: {
          scheduledAt: "desc",
        },
        select: {
          scheduledAt: true,
        },
      });

      // 3. Enforce delayBetweenEmails
      if (lastEmail) {
        const minimumNextTime =
          lastEmail.scheduledAt.getTime() + campaign.delayBetweenEmails;

        if (finalScheduledAt.getTime() < minimumNextTime) {
          finalScheduledAt = new Date(minimumNextTime);
        }
      }

      // 4. Enforce hourlyLimit
      if (campaign.hourlyLimit > 0) {
        let checked = 0;
        const maxChecks = 100;

        while (checked < maxChecks) {
          checked++;

          const hourStart = new Date(
            finalScheduledAt.getTime() - 60 * 60 * 1000
          );

          const scheduledEmails = await tx.email.findMany({
            where: {
              campaignId: input.campaignId,
              status: {
                in: ["SCHEDULED", "PROCESSING", "SENT"],
              },
              scheduledAt: {
                gt: hourStart,
                lte: finalScheduledAt,
              },
            },
            orderBy: {
              scheduledAt: "asc",
            },
            select: {
              scheduledAt: true,
            },
          });

          // Hourly limit has not been reached
          if (scheduledEmails.length < campaign.hourlyLimit) {
            break;
          }

          if (checked >= maxChecks) {
            throw new Error(
              "Unable to schedule email: Hourly limit capacity reached for the next 100 hours."
            );
          }

          // Move to one hour after the earliest email in this window
          const earliestEmail = scheduledEmails[0];

          finalScheduledAt = new Date(
            earliestEmail.scheduledAt.getTime() + 60 * 60 * 1000
          );

          // Re-check minimum delay
          if (lastEmail) {
            const minimumNextTime =
              lastEmail.scheduledAt.getTime() + campaign.delayBetweenEmails;

            if (finalScheduledAt.getTime() < minimumNextTime) {
              finalScheduledAt = new Date(minimumNextTime);
            }
          }
        }
      }

      // 5. Create email in PostgreSQL
      const email = await tx.email.create({
        data: {
          userId: input.userId,
          campaignId: input.campaignId,
          recipient: input.recipient,
          subject: input.subject,
          body: input.body,
          scheduledAt: finalScheduledAt,
          status: "SCHEDULED",
        },
      });

      return { email, campaign, finalScheduledAt };
    }
  );

  // 6. If Redis/BullMQ is available (local dev), add delayed job to queue
  if (emailQueue) {
    const delay = Math.max(0, finalScheduledAt.getTime() - Date.now());

    await emailQueue.add(
      "send-email",
      {
        emailId: email.id,
        recipient: email.recipient,
        subject: email.subject,
        body: email.body,
      },
      {
        delay,
        jobId: email.id,
      }
    );

    console.log("Email queued in BullMQ:", {
      emailId: email.id,
      scheduledAt: finalScheduledAt.toISOString(),
      delay,
    });
  } else {
    // On Vercel (no Redis): email is saved in DB with SCHEDULED status.
    // The Vercel Cron Job (/api/cron/process-emails) picks it up when due.
    console.log("Email saved to DB (cron will process):", {
      emailId: email.id,
      scheduledAt: finalScheduledAt.toISOString(),
    });
  }

  return email;
}