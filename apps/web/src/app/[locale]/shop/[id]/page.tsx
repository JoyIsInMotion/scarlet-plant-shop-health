import { getLocale, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { ArrowLeft, Leaf, Tag } from 'lucide-react';
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
  const locale = await getLocale();
  const product = await getProduct(id);
  const name = locale === 'en' ? product?.nameEn : product?.nameBg;
  return { title: name ?? 'Product' };
}

type Category = 'bouquet' | 'potted_plant' | 'succulent' | 'tropical' | 'seasonal' | 'accessories';

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTranslations();
  const locale = await getLocale();
  const product = await getProduct(id);

  if (!product) notFound();

  const name = locale === 'en' ? product.nameEn : product.nameBg;
  const description = locale === 'en' ? product.descriptionEn : product.descriptionBg;
  const related = await getRelatedProducts(product.category, product.id);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <div className="mb-8 flex items-center gap-2 text-sm">
        <Button variant="ghost" size="sm" asChild className="rounded-full text-gray-500 hover:text-gray-900 -ml-2">
          <Link href="/shop">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            {t('shop.title')}
          </Link>
        </Button>
        <span className="text-gray-300">/</span>
        <span className="truncate text-gray-500">{name}</span>
      </div>

      {/* Main product section */}
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        {/* Image */}
        <div className="overflow-hidden rounded-3xl bg-gray-50 aspect-square shadow-sm">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Leaf className="h-28 w-28 text-gray-200" />
            </div>
          )}
        </div>

        {/* Product info */}
        <div className="flex flex-col gap-6 py-2">
          {/* Category badge */}
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
            <Tag className="h-3 w-3" />
            {t(`shop.category.${product.category as Category}`)}
          </span>

          {/* Name */}
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl leading-tight">
            {name}
          </h1>

          {/* Description */}
          {description && (
            <p className="text-base leading-7 text-gray-600">{description}</p>
          )}

          <hr className="border-gray-100" />

          {/* Price + qty + add to cart */}
          <ProductActions product={product} />
        </div>
      </div>

      {/* Related products */}
      {related.length > 0 && (
        <div className="mt-20">
          <h2 className="mb-6 text-xl font-semibold text-gray-900">{t('shop.relatedProducts')}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(related as Array<{ id: string; nameBg: string; nameEn: string; imageUrl: string | null; slug: string; price: string }>)
              .slice(0, 3)
              .map((item) => {
                const relatedName = locale === 'en' ? item.nameEn : item.nameBg;
                return (
                  <Link
                    key={item.id}
                    href={`/shop/${item.slug}`}
                    className="group flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 transition-all hover:border-red-200 hover:shadow-md"
                  >
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gray-50">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={relatedName} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Leaf className="h-7 w-7 text-gray-200" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 group-hover:text-red-700 transition-colors truncate">
                        {relatedName}
                      </p>
                      <p className="mt-0.5 text-sm text-gray-500">
                        {new Intl.NumberFormat(locale === 'en' ? 'en' : 'bg', {
                          style: 'currency',
                          currency: 'BGN',
                          maximumFractionDigits: 2,
                        }).format(Number(item.price))}
                      </p>
                    </div>
                  </Link>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
