import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.fixedWindow(10, "60 s"),
});

export async function checkRateLimit(ip: string): Promise<{ ok: boolean }> {
  const { success } = await ratelimit.limit(ip);
  return { ok: success };
}
