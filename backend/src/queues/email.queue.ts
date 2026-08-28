import { Queue } from "bullmq";
import { redisConnection } from "./redis";

export const EMAIL_QUEUE_NAME = "email-send";

// Only initialize BullMQ queue if Redis is available (local dev).
// On Vercel, emails are processed by the cron endpoint directly from DB.
export const emailQueue: Queue | null = redisConnection
  ? new Queue(EMAIL_QUEUE_NAME, {
      connection: redisConnection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 5000,
        },
        removeOnComplete: {
          age: 24 * 60 * 60,
          count: 10000,
        },
        removeOnFail: {
          age: 7 * 24 * 60 * 60,
          count: 10000,
        },
      },
    })
  : null;