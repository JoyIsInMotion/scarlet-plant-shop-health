import { db, chunkInsert } from './seed-utils';
import * as schema from '../src/lib/db/schema';
import { faker } from '@faker-js/faker';

faker.seed(42);

export async function seedOrders(
  allUserIds: string[],
  allProductIds: Array<{ id: string; price: string }>,
  _addressPool: string[] = [],
) {
  const ORDER_COUNT = 1002;
  const statuses    = schema.orderStatusEnum.enumValues;

  console.log(`🛒 Seeding ${ORDER_COUNT} orders...`);

  for (let batch = 0; batch < ORDER_COUNT; batch += 200) {
    const size = Math.min(200, ORDER_COUNT - batch);

    const orderData = Array.from({ length: size }, () => {
      const userId = faker.helpers.arrayElement(allUserIds);
      const items  = faker.number.int({ min: 1, max: 3 });
      let total    = 0;
      const lineItems = Array.from({ length: items }, () => {
        const product = faker.helpers.arrayElement(allProductIds);
        const qty     = faker.number.int({ min: 1, max: 3 });
        const price   = parseFloat(product.price as string);
        total        += price * qty;
        return { productId: product.id, qty, price };
      });
      return { userId, total: parseFloat(total.toFixed(2)), lineItems };
    });

    const inserted = await db.insert(schema.orders).values(
      orderData.map(o => ({
        userId:          o.userId,
        total:           o.total.toFixed(2),
        status:          faker.helpers.arrayElement(statuses),
        shippingAddress: null,
      }))
    ).returning();

    const itemRows = inserted.flatMap((order, i) =>
      orderData[i].lineItems.map(li => ({
        orderId:   order.id,
        productId: li.productId,
        quantity:  li.qty,
        unitPrice: li.price.toFixed(2),
      }))
    );
    await chunkInsert(schema.orderItems, itemRows, 500);
  }

  console.log(`   → ${ORDER_COUNT} orders`);
}

if (require.main === module) {
  (async () => {
    const users    = await db.select({ id: schema.users.id }).from(schema.users);
    const products = await db.select({ id: schema.products.id, price: schema.products.price }).from(schema.products);
    if (!users.length || !products.length) {
      console.error('❌ Run seed-users and seed-products first');
      process.exit(1);
    }
    await seedOrders(users.map(u => u.id), products, []);
    process.exit(0);
  })().catch(err => { console.error('❌', err.message); process.exit(1); });
}
