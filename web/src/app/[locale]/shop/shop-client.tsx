'use client';
import { useLocale, useTranslations } from 'next-intl';
import { ShoppingBag, Flower2, SlidersHorizontal } from 'lucide-react';
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
  const { add, count, total: cartTotal } = useCart();
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

  const activeCategory = initialParams.category ?? '';

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">

      {/* ── Page header ── */}
      <div className="mb-8 border-b border-border pb-6">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.28em] text-scarlet">
          {t('nav.shop')}
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {t('shop.title')}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {t('shop.subtitle')}&nbsp;·&nbsp;
          <span className="font-medium text-foreground">
            {total} {currentLocale === 'en' ? 'products' : 'продукта'}
          </span>
        </p>
      </div>

      {/* ── Category quick-links (sticky so they stay while scrolling) ── */}
      <div className="sticky top-16 z-30 -mx-4 mb-6 border-b border-border bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex flex-wrap gap-2">
          <Link
            href="/shop"
            className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors ${
              activeCategory === ''
                ? 'border-scarlet bg-scarlet text-white'
                : 'border-border bg-surface text-muted hover:border-scarlet/40 hover:text-scarlet'
            }`}
          >
            {t('shop.allCategories')}
          </Link>
          {CATEGORIES.map((c) => (
            <Link
              key={c}
              href={`/shop?category=${c}`}
              className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors ${
                activeCategory === c
                  ? 'border-scarlet bg-scarlet text-white'
                  : 'border-border bg-surface text-muted hover:border-scarlet/40 hover:text-scarlet'
              }`}
            >
              {t(`shop.category.${c}`)}
            </Link>
          ))}
        </div>
      </div>

      {/* ── Search + sort ── */}
      <form method="get" className="mb-8">
        <input type="hidden" name="page" value="1" />
        {activeCategory && <input type="hidden" name="category" value={activeCategory} />}
        <div className="flex flex-wrap items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-muted" />
          <input
            name="search"
            defaultValue={initialParams.search ?? ''}
            placeholder={t('common.search')}
            className="h-9 min-w-[160px] flex-1 rounded-xl border border-border bg-surface px-3 text-sm text-foreground placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-scarlet/30 sm:flex-none"
          />
          <select
            name="sort"
            defaultValue={initialParams.sort ?? 'createdAt'}
            className="h-9 rounded-xl border border-border bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-scarlet/30"
          >
            <option value="createdAt">{t('shop.newest')}</option>
            <option value="price">{t('shop.priceDesc')}</option>
          </select>
          <button
            type="submit"
            className="h-9 rounded-xl bg-scarlet px-5 text-sm font-semibold text-white transition-colors hover:bg-scarlet-dark"
          >
            {t('common.search')}
          </button>
        </div>
      </form>

      {/* ── Products ── */}
      {products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted">
          <Flower2 className="mb-3 h-10 w-10 opacity-20" />
          <p className="text-sm">{t('common.noResults')}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((p) => (
              <div
                key={p.id}
                className="group flex flex-col overflow-hidden rounded-2xl border border-border-light bg-surface transition-all duration-200 hover:border-border hover:shadow-lg hover:shadow-scarlet/5"
              >
                {/* Image */}
                <Link href={`/shop/${p.slug}`} className="block shrink-0">
                  <div className="aspect-square overflow-hidden bg-cream">
                    {p.imageUrl ? (
                      <img
                        src={p.imageUrl}
                        alt={getName(p)}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Flower2 className="h-10 w-10 text-border" />
                      </div>
                    )}
                  </div>
                </Link>

                {/* Info */}
                <div className="flex flex-1 flex-col p-3.5">
                  <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-light">
                    {t(`shop.category.${p.category as typeof CATEGORIES[number]}`)}
                  </p>
                  <Link
                    href={`/shop/${p.slug}`}
                    className="mb-3 line-clamp-2 text-sm font-semibold leading-snug text-foreground transition-colors hover:text-scarlet"
                  >
                    {getName(p)}
                  </Link>

                  <div className="mt-auto">
                    <div className="mb-2.5 flex items-baseline justify-between">
                      <p className="text-base font-bold text-foreground">{formatPrice(p.price)}</p>
                      <p className="text-[10px] text-muted-light">
                        {p.stock > 0 ? `${p.stock} бр.` : t('shop.outOfStock')}
                      </p>
                    </div>
                    <button
                      onClick={() => handleAddToCart(p)}
                      disabled={p.stock === 0}
                      className="w-full rounded-xl bg-scarlet py-2 text-xs font-semibold text-white transition-all hover:bg-scarlet-dark disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {p.stock === 0 ? t('shop.outOfStock') : t('shop.addToCart')}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {total > pageSize && (
            <div className="mt-10 flex flex-col items-center gap-2">
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
              <p className="text-xs text-muted">
                {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} {currentLocale === 'en' ? 'of' : 'от'} {total}
              </p>
            </div>
          )}
        </>
      )}

      {/* ── Persistent cart button (stays visible while scrolling) ── */}
      {count > 0 && (
        <Link
          href="/cart"
          className="fixed bottom-6 right-6 z-30 flex items-center gap-3 rounded-full bg-scarlet py-3 pl-4 pr-5 text-white shadow-lg shadow-scarlet/30 transition-all hover:-translate-y-0.5 hover:bg-scarlet-dark"
        >
          <span className="relative">
            <ShoppingBag className="h-5 w-5" />
            <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[9px] font-bold text-scarlet">
              {count > 9 ? '9+' : count}
            </span>
          </span>
          <span className="text-sm font-semibold">{formatPrice(String(cartTotal))}</span>
        </Link>
      )}
    </div>
  );
}
