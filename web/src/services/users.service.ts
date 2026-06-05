import { eq, ilike, or, desc, count } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { uploadToR2 } from '@/lib/r2/client';
import { randomUUID } from 'crypto';
import { ServiceError } from './service-error';

const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_AVATAR_SIZE = 5 * 1024 * 1024;

export async function getMe(userId: string) {
  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      avatarUrl: users.avatarUrl,
      isActive: users.isActive,
      preferredLocale: users.preferredLocale,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) throw new ServiceError('User not found', 404);
  return user;
}

export async function updateMe(userId: string, data: { name?: string; preferredLocale?: string }) {
  const allowed: Record<string, unknown> = { updatedAt: new Date() };
  if (data.name) allowed.name = data.name;
  if (data.preferredLocale) allowed.preferredLocale = data.preferredLocale;

  const [updated] = await db
    .update(users)
    .set(allowed)
    .where(eq(users.id, userId))
    .returning({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      avatarUrl: users.avatarUrl,
      preferredLocale: users.preferredLocale,
    });

  return updated;
}

export async function uploadAvatar(userId: string, file: File) {
  if (!ALLOWED_AVATAR_TYPES.includes(file.type)) throw new ServiceError('Invalid file type', 400);
  if (file.size > MAX_AVATAR_SIZE) throw new ServiceError('File too large', 400);

  const ext = file.type.split('/')[1];
  const key = `avatars/${userId}/${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const url = await uploadToR2(key, buffer, file.type);

  await db.update(users).set({ avatarUrl: url, updatedAt: new Date() }).where(eq(users.id, userId));
  return { avatarUrl: url };
}

export async function listUsers(query: { search?: string; page: number; limit: number }) {
  const { search, page, limit } = query;
  const offset = (page - 1) * limit;

  const where = search
    ? or(ilike(users.name, `%${search}%`), ilike(users.email, `%${search}%`))
    : undefined;

  const [userList, [{ total }]] = await Promise.all([
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        avatarUrl: users.avatarUrl,
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(where)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(users).where(where),
  ]);

  return { users: userList, total, page, limit };
}
