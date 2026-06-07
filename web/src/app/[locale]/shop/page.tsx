import { getLocale, getTranslations } from 'next-intl/server';
import { listProducts } from '@/services/products.service';
import { ShopClient } from './shop-client';
import type { Metadata } from 'next';

const PAGE_SIZE = 12;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('shop');
  return { title: t('title') };
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const sp = await searchParams;
  const locale = await getLocale();
  const page = Math.max(1, parseInt(sp.page ?? '1', 10));
  const offset = (page - 1) * PAGE_SIZE;
  const sort = sp.sort === 'price' ? 'price' : 'createdAt';
  const order = sort === 'price' ? 'desc' : 'desc';

  const { items: products, total } = await listProducts({
    limit: PAGE_SIZE,
    offset,
    search: sp.search ?? undefined,
    category: sp.category ?? undefined,
    sort,
    order,
  });

  return <ShopClient products={products} total={total} locale={locale} initialParams={sp} page={page} pageSize={PAGE_SIZE} />;
}
