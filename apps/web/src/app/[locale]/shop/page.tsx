import { getTranslations, getLocale } from 'next-intl/server';
import { ShopClient } from './shop-client';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('shop');
  return { title: t('title') };
}

async function getProducts(searchParams: Record<string, string>) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const params = new URLSearchParams({ limit: '24', ...searchParams });
  const res = await fetch(`${base}/api/products?${params}`, { cache: 'no-store' });
  if (!res.ok) return { products: [], total: 0 };
  const { data } = await res.json();
  return { products: data?.products ?? [], total: data?.total ?? 0 };
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const sp = await searchParams;
  const locale = await getLocale();
  const { products, total } = await getProducts(sp);

  return <ShopClient products={products} total={total} locale={locale} initialParams={sp} />;
}
