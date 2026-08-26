import { Queue } from "bullmq";
import { redisConnection } from "./redis";

export const EMAIL_QUEUE_NAME = "email-send";

export const emailQueue = new Queue(EMAIL_QUEUE_NAME, {
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
});