import IORedis from "ioredis";

const redisHost = process.env.REDIS_HOST || "localhost";
const redisPort = Number(process.env.REDIS_PORT) || 6379;

export const redisConnection = new IORedis({
  host: redisHost,
  port: redisPort,
  maxRetriesPerRequest: null,
});