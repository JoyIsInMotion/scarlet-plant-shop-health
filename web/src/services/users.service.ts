import { eq, ilike, or, desc, count } from 'drizzle-orm';
import { db } from '@/db';
import { users } from '@/db/schema';
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
      phone: users.phone,
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

export async function updateMe(
  userId: string,
  data: { name?: string; preferredLocale?: string; phone?: string | null },
) {
  const allowed: Record<string, unknown> = { updatedAt: new Date() };
  if (data.name) allowed.name = data.name;
  if (data.preferredLocale) allowed.preferredLocale = data.preferredLocale;
  if (data.phone !== undefined) allowed.phone = data.phone || null;

  const [updated] = await db
    .update(users)
    .set(allowed)
    .where(eq(users.id, userId))
    .returning({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
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
        phone: users.phone,
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

/** Admin: fetch a single user's full profile. */
export async function getUserById(id: string) {
  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      role: users.role,
      avatarUrl: users.avatarUrl,
      isActive: users.isActive,
      preferredLocale: users.preferredLocale,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  if (!user) throw new ServiceError('User not found', 404);
  return user;
}

/**
 * Admin: update a user's role / active status / phone. `actingUserId` is the
 * admin making the change — guards against locking themselves out by demoting
 * or deactivating their own account.
 */
export async function updateUserAdmin(
  id: string,
  actingUserId: string,
  data: { role?: 'user' | 'admin'; isActive?: boolean; phone?: string | null },
) {
  const [target] = await db.select({ id: users.id }).from(users).where(eq(users.id, id)).limit(1);
  if (!target) throw new ServiceError('User not found', 404);

  if (id === actingUserId) {
    if (data.role === 'user') throw new ServiceError('You cannot remove your own admin role', 400);
    if (data.isActive === false) throw new ServiceError('You cannot deactivate your own account', 400);
  }

  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (data.role !== undefined) set.role = data.role;
  if (data.isActive !== undefined) set.isActive = data.isActive;
  if (data.phone !== undefined) set.phone = data.phone || null;

  const [updated] = await db
    .update(users)
    .set(set)
    .where(eq(users.id, id))
    .returning({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      role: users.role,
      isActive: users.isActive,
    });

  return updated;
}
