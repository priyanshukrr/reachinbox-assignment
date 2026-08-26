"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduleEmail = scheduleEmail;
const prisma_1 = __importDefault(require("../db/prisma"));
const email_queue_1 = require("../queues/email.queue");
async function scheduleEmail(input) {
    // 1. Find campaign
    const campaign = await prisma_1.default.campaign.findFirst({
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
    const lastEmail = await prisma_1.default.email.findFirst({
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
        const minimumNextTime = lastEmail.scheduledAt.getTime() +
            campaign.delayBetweenEmails;
        if (finalScheduledAt.getTime() < minimumNextTime) {
            finalScheduledAt = new Date(minimumNextTime);
        }
    }
    // 4. Enforce hourlyLimit
    if (campaign.hourlyLimit > 0) {
        let checked = 0;
        while (checked < 100) {
            checked++;
            const hourStart = new Date(finalScheduledAt.getTime() - 60 * 60 * 1000);
            const scheduledEmails = await prisma_1.default.email.findMany({
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
            // Move to one hour after the earliest email
            const earliestEmail = scheduledEmails[0];
            finalScheduledAt = new Date(earliestEmail.scheduledAt.getTime() +
                60 * 60 * 1000);
            // Re-check minimum delay
            if (lastEmail) {
                const minimumNextTime = lastEmail.scheduledAt.getTime() +
                    campaign.delayBetweenEmails;
                if (finalScheduledAt.getTime() < minimumNextTime) {
                    finalScheduledAt = new Date(minimumNextTime);
                }
            }
        }
    }
    // 5. Create email in PostgreSQL
    const email = await prisma_1.default.email.create({
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
    // 6. Calculate BullMQ delay
    const delay = Math.max(0, finalScheduledAt.getTime() - Date.now());
    // 7. Add delayed job to BullMQ
    await email_queue_1.emailQueue.add("send-email", {
        emailId: email.id,
        recipient: email.recipient,
        subject: email.subject,
        body: email.body,
    }, {
        delay,
        jobId: email.id,
    });
    console.log("📅 Email scheduled:", {
        emailId: email.id,
        scheduledAt: finalScheduledAt.toISOString(),
        delay,
        delayBetweenEmails: campaign.delayBetweenEmails,
        hourlyLimit: campaign.hourlyLimit,
    });
    return email;
}
