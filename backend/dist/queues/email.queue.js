"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailQueue = exports.EMAIL_QUEUE_NAME = void 0;
const bullmq_1 = require("bullmq");
const redis_1 = require("./redis");
exports.EMAIL_QUEUE_NAME = "email-send";
exports.emailQueue = new bullmq_1.Queue(exports.EMAIL_QUEUE_NAME, {
    connection: redis_1.redisConnection,
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
