import { eq, and, desc, inArray, count, gte, lte, ilike, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import { orders, orderItems, products, users } from '@/db/schema';
import { orderSchema } from '@scarlet/shared';
import { ServiceError } from './service-error';

type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export const ORDER_STATUSES: OrderStatus[] = [
  'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled',
];

export interface ListOrdersOpts {
  status?: string;
  from?: Date;
  to?: Date;
  search?: string;
}

export async function listOrders(userId: string, limit: number, offset: number, opts: ListOrdersOpts = {}) {
  const conditions = [eq(orders.userId, userId)];

  if (opts.status) {
    conditions.push(eq(orders.status, opts.status as OrderStatus));
  }
  if (opts.from) {
    conditions.push(gte(orders.createdAt, opts.from));
  }
  if (opts.to) {
    const end = new Date(opts.to);
    end.setHours(23, 59, 59, 999);
    conditions.push(lte(orders.createdAt, end));
  }
  if (opts.search) {
    const term = `%${opts.search}%`;
    const idTerm = `${opts.search.toLowerCase()}%`;
    // UUID columns can't use ilike directly — cast to text first
    const idCondition = sql`${orders.id}::text ilike ${idTerm}`;
    const matching = await db
      .selectDistinct({ orderId: orderItems.orderId })
      .from(orderItems)
      .leftJoin(products, eq(products.id, orderItems.productId))
      .where(or(ilike(products.nameBg, term), ilike(products.nameEn, term)));
    const matchIds = matching.map((r) => r.orderId).filter(Boolean);
    conditions.push(
      matchIds.length > 0
        ? or(idCondition, inArray(orders.id, matchIds))!
        : idCondition
    );
  }

  const where = and(...conditions);

  const [userOrders, [{ total }]] = await Promise.all([
    db.select().from(orders).where(where).orderBy(desc(orders.createdAt)).limit(limit).offset(offset),
    db.select({ total: count() }).from(orders).where(where),
  ]);

  if (userOrders.length === 0) return { items: [], total: 0, limit, offset };

  const orderIds = userOrders.map((o) => o.id);
  const itemRows = await db
    .select({
      orderId: orderItems.orderId,
      quantity: orderItems.quantity,
      unitPrice: orderItems.unitPrice,
      nameBg: products.nameBg,
      nameEn: products.nameEn,
      imageUrl: products.imageUrl,
    })
    .from(orderItems)
    .leftJoin(products, eq(products.id, orderItems.productId))
    .where(inArray(orderItems.orderId, orderIds));

  const byOrder = new Map<string, typeof itemRows>();
  for (const row of itemRows) {
    if (!byOrder.has(row.orderId)) byOrder.set(row.orderId, []);
    byOrder.get(row.orderId)!.push(row);
  }

  return {
    items: userOrders.map((o) => ({ ...o, items: byOrder.get(o.id) ?? [] })),
    total: Number(total),
    limit,
    offset,
  };
}

/** Admin: list every order (with customer name/email) — paged, filterable. */
export async function listAllOrders(limit: number, offset: number, opts: ListOrdersOpts = {}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const conditions: any[] = [];

  if (opts.status) conditions.push(eq(orders.status, opts.status as OrderStatus));
  if (opts.from) conditions.push(gte(orders.createdAt, opts.from));
  if (opts.to) {
    const end = new Date(opts.to);
    end.setHours(23, 59, 59, 999);
    conditions.push(lte(orders.createdAt, end));
  }
  if (opts.search) {
    const term = `%${opts.search}%`;
    const idTerm = `${opts.search.toLowerCase()}%`;
    const idCondition = sql`${orders.id}::text ilike ${idTerm}`;
    const matching = await db
      .selectDistinct({ orderId: orderItems.orderId })
      .from(orderItems)
      .leftJoin(products, eq(products.id, orderItems.productId))
      .where(or(ilike(products.nameBg, term), ilike(products.nameEn, term)));
    const matchIds = matching.map((r) => r.orderId).filter(Boolean);
    conditions.push(matchIds.length > 0 ? or(idCondition, inArray(orders.id, matchIds))! : idCondition);
  }

  const where = conditions.length ? and(...conditions) : undefined;

  const rowsQuery = db
    .select({
      id: orders.id,
      userId: orders.userId,
      total: orders.total,
      status: orders.status,
      shippingAddress: orders.shippingAddress,
      notes: orders.notes,
      createdAt: orders.createdAt,
      userName: users.name,
      userEmail: users.email,
    })
    .from(orders)
    .leftJoin(users, eq(users.id, orders.userId));

  const [rows, [{ total }]] = await Promise.all([
    (where ? rowsQuery.where(where) : rowsQuery).orderBy(desc(orders.createdAt)).limit(limit).offset(offset),
    where
      ? db.select({ total: count() }).from(orders).where(where)
      : db.select({ total: count() }).from(orders),
  ]);

  if (rows.length === 0) return { items: [], total: Number(total), limit, offset };

  const orderIds = rows.map((o) => o.id);
  const itemRows = await db
    .select({
      orderId: orderItems.orderId,
      quantity: orderItems.quantity,
      unitPrice: orderItems.unitPrice,
      nameBg: products.nameBg,
      nameEn: products.nameEn,
      imageUrl: products.imageUrl,
    })
    .from(orderItems)
    .leftJoin(products, eq(products.id, orderItems.productId))
    .where(inArray(orderItems.orderId, orderIds));

  const byOrder = new Map<string, typeof itemRows>();
  for (const row of itemRows) {
    if (!byOrder.has(row.orderId)) byOrder.set(row.orderId, []);
    byOrder.get(row.orderId)!.push(row);
  }

  return {
    items: rows.map((o) => ({ ...o, items: byOrder.get(o.id) ?? [] })),
    total: Number(total),
    limit,
    offset,
  };
}

/** Admin: update an order's status / notes / shipping address. */
export async function updateOrder(
  orderId: string,
  data: { status?: string; notes?: string | null; shippingAddress?: string | null }
) {
  const [existing] = await db.select({ id: orders.id }).from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!existing) throw new ServiceError('Order not found', 404);

  const set: Partial<typeof orders.$inferInsert> = { updatedAt: new Date() };
  if (data.status !== undefined) {
    if (!ORDER_STATUSES.includes(data.status as OrderStatus)) {
      throw new ServiceError('Invalid status', 400);
    }
    set.status = data.status as OrderStatus;
  }
  if (data.notes !== undefined) set.notes = data.notes;
  if (data.shippingAddress !== undefined) set.shippingAddress = data.shippingAddress;

  const [updated] = await db.update(orders).set(set).where(eq(orders.id, orderId)).returning();
  return updated;
}

/** Admin: delete an order (its items cascade). */
export async function deleteOrder(orderId: string) {
  const [existing] = await db.select({ id: orders.id }).from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!existing) throw new ServiceError('Order not found', 404);
  await db.delete(orders).where(eq(orders.id, orderId));
  return { id: orderId };
}

export async function createOrder(userId: string, data: unknown) {
  const parsed = orderSchema.safeParse(data);
  if (!parsed.success) throw new ServiceError(parsed.error.errors[0].message, 400);

  const productIds = parsed.data.items.map((i) => i.productId);
  const productList = await db
    .select()
    .from(products)
    .where(and(inArray(products.id, productIds), eq(products.isActive, true)));

  const productMap = new Map(productList.map((p) => [p.id, p]));

  for (const item of parsed.data.items) {
    const product = productMap.get(item.productId);
    if (!product) throw new ServiceError(`Product ${item.productId} not found`, 400);
    if (product.stock < item.quantity) {
      throw new ServiceError(`Insufficient stock for "${product.nameBg}"`, 400);
    }
  }

  const total = parsed.data.items.reduce((sum, item) => {
    return sum + parseFloat(productMap.get(item.productId)!.price) * item.quantity;
  }, 0);

  const [order] = await db
    .insert(orders)
    .values({
      userId,
      total: total.toFixed(2),
      shippingAddress: parsed.data.shippingAddress ?? null,
      notes: parsed.data.notes ?? null,
    })
    .returning();

  await db.insert(orderItems).values(
    parsed.data.items.map((item) => ({
      orderId: order.id,
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: productMap.get(item.productId)!.price,
    }))
  );

  for (const item of parsed.data.items) {
    const product = productMap.get(item.productId)!;
    await db
      .update(products)
      .set({ stock: product.stock - item.quantity, updatedAt: new Date() })
      .where(eq(products.id, item.productId));
  }

  return order;
}
