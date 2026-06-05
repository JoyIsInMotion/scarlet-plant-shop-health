import { db } from '@/lib/db';
import { aiAnalyses } from '@/lib/db/schema';
import { eq, and, gte, count } from 'drizzle-orm';
import { AI_RATE_LIMIT_PER_DAY } from '@scarlet/shared';

export async function checkAIRateLimit(userId: string, role: 'user' | 'admin'): Promise<void> {
  if (role === 'admin') return; // admins are exempt

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [{ value }] = await db
    .select({ value: count() })
    .from(aiAnalyses)
    .where(and(eq(aiAnalyses.userId, userId), gte(aiAnalyses.analyzedAt, since)));

  if (Number(value) >= AI_RATE_LIMIT_PER_DAY) {
    const retryAfter = Math.ceil((since.getTime() + 24 * 60 * 60 * 1000 - Date.now()) / 1000);
    throw Object.assign(new Error('Rate limit exceeded'), { status: 429, retryAfter });
  }
}
