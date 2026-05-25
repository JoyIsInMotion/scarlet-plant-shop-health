import { eq, ilike, or, and, asc, desc, count } from 'drizzle-orm';
import { db } from '@/lib/db';
import { products } from '@/lib/db/schema';
import { slugify } from '@/lib/utils/slugify';
import { ServiceError } from './service-error';

export async function listProducts(query: {
  limit: number;
  offset: number;
  search?: string;
  category?: string;
  sort: string;
  order: 'asc' | 'desc';
}) {
  const orderFn = query.order === 'asc' ? asc : desc;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const conditions: any[] = [eq(products.isActive, true)];

  if (query.search) {
    conditions.push(or(ilike(products.nameBg, `%${query.search}%`), ilike(products.nameEn, `%${query.search}%`)));
  }
  if (query.category) {
    conditions.push(eq(products.category, query.category as 'bouquet'));
  }

  const col = query.sort === 'price' ? products.price : products.createdAt;
  const baseQuery = db.select().from(products).where(and(...conditions));
  const [items, [{ total }]] = await Promise.all([
    baseQuery.orderBy(orderFn(col)).limit(query.limit).offset(query.offset),
    db.select({ total: count() }).from(products).where(and(...conditions)),
  ]);

  return { items, total: Number(total), limit: query.limit, offset: query.offset, hasMore: query.offset + items.length < Number(total) };
}

export async function getProduct(idOrSlug: string) {
  const [product] = await db
    .select()
    .from(products)
    .where(or(eq(products.id, idOrSlug), eq(products.slug, idOrSlug)))
    .limit(1);

  if (!product) throw new ServiceError('Product not found', 404);
  return product;
}

export async function createProduct(data: {
  nameBg: string;
  nameEn: string;
  descriptionBg?: string;
  descriptionEn?: string;
  price: string;
  category: string;
  stock?: number;
  slug?: string;
}) {
  if (!data.nameBg || !data.nameEn || !data.price || !data.category) {
    throw new ServiceError('Missing required fields', 400);
  }

  const slug = data.slug ?? slugify(data.nameEn);

  const [product] = await db
    .insert(products)
    .values({
      nameBg: data.nameBg,
      nameEn: data.nameEn,
      descriptionBg: data.descriptionBg ?? null,
      descriptionEn: data.descriptionEn ?? null,
      price: data.price,
      category: data.category as 'bouquet',
      stock: data.stock ?? 0,
      slug,
    })
    .returning();

  return product;
}

export async function updateProduct(id: string, data: Record<string, unknown>) {
  const [updated] = await db
    .update(products)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(products.id, id))
    .returning();

  if (!updated) throw new ServiceError('Product not found', 404);
  return updated;
}

export async function deactivateProduct(id: string) {
  await db.update(products).set({ isActive: false, updatedAt: new Date() }).where(eq(products.id, id));
}
