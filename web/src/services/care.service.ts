import { eq, and, desc, count } from 'drizzle-orm';
import { db } from '@/db';
import { plants, plantCareSchedules, plantCareLogs, plantSpecies } from '@/db/schema';
import { ServiceError } from './service-error';

async function assertPlantOwner(plantId: string, userId: string) {
  const [plant] = await db
    .select({ id: plants.id, userId: plants.userId, speciesId: plants.speciesId })
    .from(plants)
    .where(eq(plants.id, plantId))
    .limit(1);
  if (!plant) throw new ServiceError('Plant not found', 404);
  if (plant.userId !== userId) throw new ServiceError('Forbidden', 403);
  return plant;
}

// ── Schedule ──────────────────────────────────────────────────────────────────

export async function getSchedule(plantId: string, userId: string) {
  await assertPlantOwner(plantId, userId);

  const [schedule] = await db
    .select()
    .from(plantCareSchedules)
    .where(eq(plantCareSchedules.plantId, plantId))
    .limit(1);

  return schedule ?? null;
}

export async function updateSchedule(
  plantId: string,
  userId: string,
  data: {
    wateringIntervalDays?: number;
    fertilizingIntervalDays?: number;
    repottingIntervalMonths?: number;
    mistingNeeded?: boolean;
    notes?: string;
  },
) {
  await assertPlantOwner(plantId, userId);

  const existing = await getSchedule(plantId, userId);

  const now = new Date();
  const updates: Record<string, unknown> = { isCustomized: true, updatedAt: now };

  if (data.wateringIntervalDays !== undefined) {
    updates.wateringIntervalDays = data.wateringIntervalDays;
    updates.wateringNextDue = new Date(now.getTime() + data.wateringIntervalDays * 24 * 60 * 60 * 1000);
  }
  if (data.fertilizingIntervalDays !== undefined) {
    updates.fertilizingIntervalDays = data.fertilizingIntervalDays;
    updates.fertilizingNextDue = new Date(now.getTime() + data.fertilizingIntervalDays * 24 * 60 * 60 * 1000);
  }
  if (data.repottingIntervalMonths !== undefined) {
    updates.repottingIntervalMonths = data.repottingIntervalMonths;
    updates.repottingNextDue = new Date(now.getTime() + data.repottingIntervalMonths * 30 * 24 * 60 * 60 * 1000);
  }
  if (data.mistingNeeded !== undefined) updates.mistingNeeded = data.mistingNeeded;
  if (data.notes !== undefined) updates.notes = data.notes;

  if (existing) {
    const [updated] = await db
      .update(plantCareSchedules)
      .set(updates)
      .where(eq(plantCareSchedules.plantId, plantId))
      .returning();
    return updated;
  }

  // No schedule yet — create one
  const [created] = await db
    .insert(plantCareSchedules)
    .values({ plantId, ...updates, isCustomized: true })
    .returning();
  return created;
}

// ── Care logs ─────────────────────────────────────────────────────────────────

export async function createCareLog(
  plantId: string,
  userId: string,
  data: { careType: typeof plantCareLogs.$inferInsert['careType']; photoUrl?: string; notes?: string },
) {
  await assertPlantOwner(plantId, userId);

  const now = new Date();

  const [log] = await db
    .insert(plantCareLogs)
    .values({
      plantId,
      userId,
      careType: data.careType,
      photoUrl: data.photoUrl ?? null,
      notes: data.notes ?? null,
      loggedAt: now,
    })
    .returning();

  // Update plants.lastWatered and recalculate schedule next_due
  if (data.careType === 'watered') {
    await db.update(plants).set({ lastWatered: now, updatedAt: now }).where(eq(plants.id, plantId));
  }

  const [schedule] = await db
    .select()
    .from(plantCareSchedules)
    .where(eq(plantCareSchedules.plantId, plantId))
    .limit(1);

  if (schedule) {
    const scheduleUpdates: Record<string, unknown> = { updatedAt: now };

    if (data.careType === 'watered' && schedule.wateringIntervalDays) {
      scheduleUpdates.wateringNextDue = new Date(now.getTime() + schedule.wateringIntervalDays * 24 * 60 * 60 * 1000);
    }
    if (data.careType === 'fertilized' && schedule.fertilizingIntervalDays) {
      scheduleUpdates.fertilizingNextDue = new Date(now.getTime() + schedule.fertilizingIntervalDays * 24 * 60 * 60 * 1000);
    }
    if (data.careType === 'repotted' && schedule.repottingIntervalMonths) {
      scheduleUpdates.repottingNextDue = new Date(now.getTime() + schedule.repottingIntervalMonths * 30 * 24 * 60 * 60 * 1000);
    }
    if (data.careType === 'misted' && schedule.mistingNeeded) {
      scheduleUpdates.mistingNextDue = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
    }

    if (Object.keys(scheduleUpdates).length > 1) {
      await db
        .update(plantCareSchedules)
        .set(scheduleUpdates)
        .where(eq(plantCareSchedules.plantId, plantId));
    }
  }

  return log;
}

export async function listCareLogs(
  plantId: string,
  userId: string,
  query: { limit: number; offset: number; careType?: string },
) {
  await assertPlantOwner(plantId, userId);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const conditions: any[] = [eq(plantCareLogs.plantId, plantId)];
  if (query.careType) {
    conditions.push(eq(plantCareLogs.careType, query.careType as typeof plantCareLogs.$inferInsert['careType']));
  }

  const [logs, [{ total }]] = await Promise.all([
    db
      .select()
      .from(plantCareLogs)
      .where(and(...conditions))
      .orderBy(desc(plantCareLogs.loggedAt))
      .limit(query.limit)
      .offset(query.offset),
    db.select({ total: count() }).from(plantCareLogs).where(and(...conditions)),
  ]);

  return { logs, total: Number(total), limit: query.limit, offset: query.offset };
}

// ── Schedule generation on plant creation ─────────────────────────────────────

export async function createScheduleFromSpecies(plantId: string, speciesId: string) {
  const [species] = await db
    .select({
      wateringIntervalDays: plantSpecies.wateringIntervalDays,
      fertilizingIntervalDays: plantSpecies.fertilizingIntervalDays,
      repottingIntervalMonths: plantSpecies.repottingIntervalMonths,
      mistingNeeded: plantSpecies.mistingNeeded,
    })
    .from(plantSpecies)
    .where(eq(plantSpecies.id, speciesId))
    .limit(1);

  if (!species) return null;

  const now = new Date();
  const wDays  = species.wateringIntervalDays  ?? 7;
  const fDays  = species.fertilizingIntervalDays ?? 14;
  const rMonth = species.repottingIntervalMonths ?? 18;
  const mist   = species.mistingNeeded ?? false;

  const values = {
    wateringIntervalDays:    wDays,
    wateringNextDue:         new Date(now.getTime() + wDays * 24 * 60 * 60 * 1000),
    fertilizingIntervalDays: fDays,
    fertilizingNextDue:      new Date(now.getTime() + fDays * 24 * 60 * 60 * 1000),
    repottingIntervalMonths: rMonth,
    repottingNextDue:        new Date(now.getTime() + rMonth * 30 * 24 * 60 * 60 * 1000),
    mistingNeeded:           mist,
    mistingNextDue:          mist ? new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000) : null,
    isCustomized:            false,
    updatedAt:               now,
  };

  const [existing] = await db
    .select({ isCustomized: plantCareSchedules.isCustomized })
    .from(plantCareSchedules)
    .where(eq(plantCareSchedules.plantId, plantId))
    .limit(1);

  // Don't clobber a schedule the user already hand-tuned
  if (existing?.isCustomized) return null;

  if (existing) {
    const [updated] = await db
      .update(plantCareSchedules)
      .set(values)
      .where(eq(plantCareSchedules.plantId, plantId))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(plantCareSchedules)
    .values({ plantId, ...values })
    .returning();
  return created;
}

// ── Care log updates and deletes ───────────────────────────────────────────────

export async function updateCareLog(
  logId: string,
  userId: string,
  data: { notes?: string },
) {
  const [log] = await db
    .select({ userId: plantCareLogs.userId })
    .from(plantCareLogs)
    .where(eq(plantCareLogs.id, logId))
    .limit(1);

  if (!log) throw new ServiceError('Care log not found', 404);
  if (log.userId !== userId) throw new ServiceError('Forbidden', 403);

  const updates: Record<string, unknown> = {};
  if (data.notes !== undefined) updates.notes = data.notes ?? null;

  const [updated] = await db
    .update(plantCareLogs)
    .set(updates)
    .where(eq(plantCareLogs.id, logId))
    .returning();

  return updated;
}

export async function deleteCareLog(logId: string, userId: string) {
  const [log] = await db
    .select({ userId: plantCareLogs.userId })
    .from(plantCareLogs)
    .where(eq(plantCareLogs.id, logId))
    .limit(1);

  if (!log) throw new ServiceError('Care log not found', 404);
  if (log.userId !== userId) throw new ServiceError('Forbidden', 403);

  await db.delete(plantCareLogs).where(eq(plantCareLogs.id, logId));
}
