import { eq, and, desc, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { orders, orderItems, products } from '@/lib/db/schema';
import { orderSchema } from '@scarlet/shared';
import { ServiceError } from './service-error';

export async function listOrders(userId: string, limit: number, offset: number) {
  const userOrders = await db
    .select()
    .from(orders)
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.createdAt))
    .limit(limit)
    .offset(offset);

  return { items: userOrders, limit, offset };
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
