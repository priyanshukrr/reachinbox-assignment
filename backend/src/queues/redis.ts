import IORedis from "ioredis";

const redisHost = process.env.REDIS_HOST;
const redisPort = Number(process.env.REDIS_PORT) || 6379;

// Only create Redis connection if REDIS_HOST is configured (local dev).
// On Vercel (no persistent Redis), this stays null and the cron endpoint
// handles email processing directly from the database.
export const redisConnection: IORedis | null = redisHost
  ? new IORedis({
      host: redisHost,
      port: redisPort,
      maxRetriesPerRequest: null,
    })
  : null;