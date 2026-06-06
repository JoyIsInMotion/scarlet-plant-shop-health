import { db } from '@/db';
import { aiAnalyses } from '@/db/schema';
import { eq, and, gte, count } from 'drizzle-orm';
import { AI_RATE_LIMIT_PER_DAY } from '@scarlet/shared';

async function countScansSince(userId: string, since: Date): Promise<number> {
  const [{ value }] = await db
    .select({ value: count() })
    .from(aiAnalyses)
    .where(and(eq(aiAnalyses.userId, userId), gte(aiAnalyses.analyzedAt, since)));
  return Number(value);
}

export async function checkAIRateLimit(userId: string, role: 'user' | 'admin'): Promise<void> {
  if (role === 'admin') return; // admins are exempt

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const used = await countScansSince(userId, since);

  if (used >= AI_RATE_LIMIT_PER_DAY) {
    const retryAfter = Math.ceil((since.getTime() + 24 * 60 * 60 * 1000 - Date.now()) / 1000);
    throw Object.assign(new Error('Rate limit exceeded'), { status: 429, retryAfter });
  }
}

// null = unlimited (admin); otherwise scans left in the rolling 24h window
export async function getAIScansRemaining(userId: string, role: 'user' | 'admin'): Promise<number | null> {
  if (role === 'admin') return null;

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const used = await countScansSince(userId, since);
  return Math.max(0, AI_RATE_LIMIT_PER_DAY - used);
}
