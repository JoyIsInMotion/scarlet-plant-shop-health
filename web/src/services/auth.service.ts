import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { eq, and, gt } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users, refreshTokens } from '@/lib/db/schema';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '@/lib/auth/jwt';
import { ServiceError } from './service-error';

const REFRESH_EXPIRES_MS = 7 * 24 * 60 * 60 * 1000;

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function issueTokens(userId: string, role: 'user' | 'admin') {
  return {
    accessToken: signAccessToken(userId, role),
    refreshToken: signRefreshToken(userId),
  };
}

async function storeRefreshToken(userId: string, refreshToken: string) {
  const tokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_EXPIRES_MS);
  await db.insert(refreshTokens).values({ userId, tokenHash, expiresAt });
}

export async function register(name: string, email: string, password: string) {
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing.length > 0) throw new ServiceError('Email already registered', 409);

  const passwordHash = await bcrypt.hash(password, 10);

  const [user] = await db
    .insert(users)
    .values({ name, email, passwordHash })
    .returning({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      avatarUrl: users.avatarUrl,
      isActive: users.isActive,
      preferredLocale: users.preferredLocale,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    });

  const { accessToken, refreshToken } = issueTokens(user.id, user.role);
  await storeRefreshToken(user.id, refreshToken);

  return { user, accessToken, refreshToken };
}

export async function login(email: string, password: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (!user || !user.isActive) throw new ServiceError('Invalid credentials', 401);

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new ServiceError('Invalid credentials', 401);

  const { accessToken, refreshToken } = issueTokens(user.id, user.role);
  await storeRefreshToken(user.id, refreshToken);

  const { passwordHash: _, ...safeUser } = user;
  return { user: safeUser, accessToken, refreshToken };
}

export async function logout(token: string | undefined) {
  if (!token) return;
  await db.delete(refreshTokens).where(eq(refreshTokens.tokenHash, hashToken(token)));
}

export async function refresh(token: string) {
  let payload: { sub: string };
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw new ServiceError('Invalid refresh token', 401);
  }

  const [stored] = await db
    .select()
    .from(refreshTokens)
    .where(and(eq(refreshTokens.tokenHash, hashToken(token)), gt(refreshTokens.expiresAt, new Date())))
    .limit(1);

  if (!stored) throw new ServiceError('Refresh token not found or expired', 401);

  const [user] = await db
    .select({ id: users.id, role: users.role, isActive: users.isActive })
    .from(users)
    .where(eq(users.id, payload.sub))
    .limit(1);

  if (!user || !user.isActive) throw new ServiceError('User not found or inactive', 401);

  await db.delete(refreshTokens).where(eq(refreshTokens.id, stored.id));

  const { accessToken, refreshToken: newRefreshToken } = issueTokens(user.id, user.role);
  await storeRefreshToken(user.id, newRefreshToken);

  return { accessToken, refreshToken: newRefreshToken };
}
