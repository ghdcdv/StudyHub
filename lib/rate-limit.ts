import "server-only";

import { addSeconds } from "date-fns";
import { db } from "@/lib/db";

export async function enforceRateLimit(
  userId: string,
  key: string,
  limit: number,
  windowSeconds = Number(process.env.RATE_LIMIT_WINDOW_SECONDS ?? "60")
): Promise<void> {
  const now = new Date();
  const resetAt = addSeconds(now, windowSeconds);
  const existing = await db.rateLimitBucket.findUnique({
    where: { userId_key: { userId, key } }
  });

  if (!existing || existing.resetAt <= now) {
    await db.rateLimitBucket.upsert({
      where: { userId_key: { userId, key } },
      create: {
        userId,
        key,
        count: 1,
        resetAt
      },
      update: {
        count: 1,
        resetAt
      }
    });
    return;
  }

  if (existing.count >= limit) {
    throw new Error("Rate limit exceeded. Please wait before trying again.");
  }

  await db.rateLimitBucket.update({
    where: { userId_key: { userId, key } },
    data: {
      count: { increment: 1 }
    }
  });
}
