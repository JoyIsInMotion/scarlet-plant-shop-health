import { getLocale, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { ArrowLeft, Leaf } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { ProductActions } from '@/components/shop/product-actions';
import type { Metadata } from 'next';

async function getProduct(id: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const res = await fetch(`${base}/api/products/${id}`, { cache: 'no-store' });
  if (!res.ok) return null;
  const { data } = await res.json();
  return data;
}

async function getRelatedProducts(category: string, currentId: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const params = new URLSearchParams({ limit: '4', category, sort: 'createdAt', order: 'desc' });
  const res = await fetch(`${base}/api/products?${params}`, { cache: 'no-store' });
  if (!res.ok) return [];
  const { data } = await res.json();
  return (data?.items ?? []).filter((item: { id: string }) => item.id !== currentId);
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const product = await getProduct(id);
  return { title: product?.nameBg ?? product?.nameEn ?? 'Product' };
}

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTranslations();
  const locale = await getLocale();
  const product = await getProduct(id);

  if (!product) notFound();

  const name = locale === 'en' ? product.nameEn : product.nameBg;
  const description = locale === 'en' ? product.descriptionEn : product.descriptionBg;
  const related = await getRelatedProducts(product.category, product.id);
  const price = new Intl.NumberFormat(locale === 'en' ? 'en' : 'bg', {
    style: 'currency',
    currency: 'BGN',
    maximumFractionDigits: 2,
  }).format(Number(product.price));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="rounded-full">
          <Link href="/shop"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-red-500">{t('shop.title')}</p>
          <h1 className="truncate text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">{name}</h1>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="overflow-hidden border-gray-200 shadow-sm">
          <div className="aspect-[4/3] bg-gray-100">
            {product.imageUrl ? (
              <img src={product.imageUrl} alt={name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center">
                <Leaf className="h-16 w-16 text-gray-300" />
              </div>
            )}
          </div>
          <CardContent className="space-y-5 p-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                {t(`shop.category.${product.category as 'bouquet' | 'potted_plant' | 'succulent' | 'tropical' | 'seasonal' | 'accessories'}`)}
              </span>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                {product.slug}
              </span>
            </div>
            <div>
              <p className="text-3xl font-semibold tracking-tight text-gray-900">{price}</p>
              <p className="mt-2 text-sm leading-6 text-gray-600">{description ?? t('shop.noDescription')}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{t('shop.stock')}</p>
                <p className="mt-1 text-lg font-semibold text-gray-900">{product.stock}</p>
              </div>
              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{t('common.created')}</p>
                <p className="mt-1 text-sm font-medium text-gray-900">
                  {new Intl.DateTimeFormat(locale === 'en' ? 'en' : 'bg', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(product.createdAt))}
                </p>
              </div>
              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{t('common.updated')}</p>
                <p className="mt-1 text-sm font-medium text-gray-900">
                  {new Intl.DateTimeFormat(locale === 'en' ? 'en' : 'bg', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(product.updatedAt))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <ProductActions product={product} />
          {related.length > 0 && (
            <Card className="border-gray-200 shadow-sm">
              <CardContent className="space-y-4 p-5">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{t('shop.relatedProducts')}</p>
                  <p className="text-sm text-gray-500">{locale === 'en' ? 'More items in the same category.' : 'Още продукти от същата категория.'}</p>
                </div>
                <div className="grid gap-3">
                  {related.map((item: {
                    id: string;
                    nameBg: string;
                    nameEn: string;
                    imageUrl: string | null;
                    slug: string;
                    price: string;
                  }) => {
                    const relatedName = locale === 'en' ? item.nameEn : item.nameBg;
                    return (
                      <Link key={item.id} href={`/shop/${item.slug}`} className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3 transition-colors hover:border-red-200 hover:bg-red-50/40">
                        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={relatedName} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full items-center justify-center">
                              <Leaf className="h-6 w-6 text-gray-300" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-gray-900">{relatedName}</p>
                          <p className="text-sm text-gray-500">
                            {new Intl.NumberFormat(locale === 'en' ? 'en' : 'bg', { style: 'currency', currency: 'BGN', maximumFractionDigits: 2 }).format(Number(item.price))}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
