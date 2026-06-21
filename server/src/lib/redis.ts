import { Redis } from "ioredis";

export const redis = new Redis(process.env["REDIS_URL"]!, {
  tls: { rejectUnauthorized: false },
  maxRetriesPerRequest: 3,
  enableReadyCheck: false,
  retryStrategy: (times) => {
    if (times >= 3) return null; // stop retrying after 3 attempts
    return Math.min(times * 500, 2000);
  },
});

redis.on("error", (err) => {
  const e = err as Error & { code?: string };
  // log once per error type — don't spam on repeated quota/connection errors
  console.error("[redis]", e.code ?? e.name, e.message || "(no message)");
});