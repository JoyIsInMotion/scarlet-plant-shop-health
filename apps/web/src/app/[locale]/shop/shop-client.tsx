'use client';
import { useLocale, useTranslations } from 'next-intl';
import { ShoppingBag, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Pagination } from '@/components/ui/pagination';
import { useCart } from '@/hooks/use-cart';
import { useToast } from '@/hooks/use-toast';
import { Link } from '@/i18n/navigation';

interface Product {
  id: string;
  nameBg: string;
  nameEn: string;
  descriptionBg: string | null;
  descriptionEn: string | null;
  price: string;
  category: string;
  imageUrl: string | null;
  stock: number;
  slug: string;
}

interface ShopClientProps {
  products: Product[];
  total: number;
  locale: string;
  initialParams: Record<string, string>;
  page: number;
  pageSize: number;
}

const CATEGORIES = [
  'bouquet', 'potted_plant', 'succulent', 'tropical', 'seasonal', 'accessories',
] as const;

export function ShopClient({ products, total, locale, initialParams, page, pageSize }: ShopClientProps) {
  const t = useTranslations();
  const currentLocale = useLocale();
  const { add } = useCart();
  const { toast } = useToast();

  function getName(p: Product) {
    return locale === 'en' ? p.nameEn : p.nameBg;
  }

  function formatPrice(price: string) {
    return new Intl.NumberFormat(currentLocale === 'en' ? 'en' : 'bg', {
      style: 'currency',
      currency: 'BGN',
      maximumFractionDigits: 2,
    }).format(Number(price));
  }

  function handleAddToCart(p: Product) {
    add({ id: p.id, name: getName(p), price: Number(p.price), imageUrl: p.imageUrl });
    toast({ title: t('shop.addToCart'), description: getName(p), variant: 'success' });
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 rounded-[2rem] border border-red-100 bg-gradient-to-br from-white via-white to-rose-50 p-5 shadow-sm sm:p-6">
        <div className="max-w-3xl space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-red-500">{t('nav.shop')}</p>
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">{t('shop.title')}</h1>
          <p className="text-sm leading-6 text-gray-600 sm:text-base">{t('shop.subtitle')}</p>
          <p className="text-sm font-medium text-gray-500">{total} {currentLocale === 'en' ? 'products' : 'продукта'}</p>
        </div>
      </div>

      <form method="get" className="mb-6 rounded-[2rem] border border-gray-200 bg-white p-4 shadow-sm">
        <input type="hidden" name="page" value="1" />
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.7fr)_minmax(11rem,1fr)_minmax(11rem,1fr)_auto]">
          <input
            name="search"
            defaultValue={initialParams.search ?? ''}
            placeholder={t('common.search')}
            className="h-11 rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          <select
            name="category"
            defaultValue={initialParams.category ?? ''}
            className="h-11 rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="">{t('shop.allCategories')}</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{t(`shop.category.${c}`)}</option>
            ))}
          </select>
          <select
            name="sort"
            defaultValue={initialParams.sort ?? 'createdAt'}
            className="h-11 rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="createdAt">{t('shop.newest')}</option>
            <option value="price">{t('shop.priceDesc')}</option>
          </select>
          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-red-700"
          >
            {t('common.search')}
          </button>
        </div>
      </form>

      {products.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-200 bg-white py-16 text-center text-gray-400">
          <ShoppingBag className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>{t('common.noResults')}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {products.map((p) => (
            <Card key={p.id} className="group flex h-full flex-col overflow-hidden border-gray-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
              <Link href={`/shop/${p.slug}`} className="block shrink-0">
                <div className="aspect-[4/3] overflow-hidden bg-gray-100">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={getName(p)} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <ShoppingBag className="h-10 w-10 text-gray-300" />
                    </div>
                  )}
                </div>
              </Link>
              <CardContent className="flex flex-1 flex-col p-4">
                <div className="mb-4 flex items-start justify-between gap-2">
                  <Link href={`/shop/${p.slug}`} className="line-clamp-2 text-base font-semibold text-gray-900 transition-colors hover:text-red-700">
                    {getName(p)}
                  </Link>
                  <Badge variant="default" className="shrink-0 rounded-full text-xs">
                    {t(`shop.category.${p.category as typeof CATEGORIES[number]}`)}
                  </Badge>
                </div>

                <div className="mt-auto space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="block text-xl font-bold text-gray-900">{formatPrice(p.price)}</span>
                      <span className="text-xs text-gray-400">
                        {p.stock > 0 ? `${p.stock} ${t('shop.inStock')}` : t('shop.outOfStock')}
                      </span>
                    </div>
                    <Button asChild variant="ghost" size="sm" className="rounded-full text-red-700 hover:bg-red-50 hover:text-red-800">
                      <Link href={`/shop/${p.slug}`} className="inline-flex items-center gap-1">
                        {t('shop.viewDetails')}
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleAddToCart(p)}
                    disabled={p.stock === 0}
                    className="h-10 w-full rounded-2xl"
                  >
                    <ShoppingBag className="h-3.5 w-3.5" />
                    {p.stock === 0 ? t('shop.outOfStock') : t('shop.addToCart')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          </div>

          {total > pageSize && (
            <div className="mt-8 flex flex-col items-center gap-2">
              <Pagination
                page={page}
                total={total}
                limit={pageSize}
                getHref={(nextPage) => {
                  const params = new URLSearchParams();
                  params.set('page', String(nextPage));
                  if (initialParams.search) params.set('search', initialParams.search);
                  if (initialParams.category) params.set('category', initialParams.category);
                  if (initialParams.sort) params.set('sort', initialParams.sort);
                  return `?${params.toString()}`;
                }}
              />
              <p className="text-xs text-gray-400">
                {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} {currentLocale === 'en' ? 'of' : 'от'} {total}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
