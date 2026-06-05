import { count, sum, gte } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users, plants, orders, aiAnalyses } from '@/lib/db/schema';

export async function getAdminStats() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    [{ totalUsers }],
    [{ totalPlants }],
    [{ totalOrders }],
    [{ revenue }],
    [{ aiScansToday }],
  ] = await Promise.all([
    db.select({ totalUsers: count() }).from(users),
    db.select({ totalPlants: count() }).from(plants),
    db.select({ totalOrders: count() }).from(orders),
    db.select({ revenue: sum(orders.total) }).from(orders),
    db.select({ aiScansToday: count() }).from(aiAnalyses).where(gte(aiAnalyses.analyzedAt, todayStart)),
  ]);

  return { totalUsers, totalPlants, totalOrders, revenue: revenue ?? '0', aiScansToday };
}
