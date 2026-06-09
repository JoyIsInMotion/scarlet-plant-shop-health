import { getLocale, getTranslations } from 'next-intl/server';
import { getAccessToken } from '@/lib/auth/cookies';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { listOrders } from '@/services/orders.service';
import { redirect, Link } from '@/i18n/navigation';
import { ShoppingBag, Clock, CheckCircle2, Truck, XCircle, Package, Search, SlidersHorizontal } from 'lucide-react';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('orders');
  return { title: t('myOrders') };
}

const PAGE_SIZE = 10;

const ORDER_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'] as const;

const STATUS_STYLES: Record<string, { bg: string; text: string; icon: React.ComponentType<{ className?: string }> }> = {
  pending:    { bg: 'bg-amber-50',   text: 'text-amber-700',  icon: Clock },
  confirmed:  { bg: 'bg-blue-50',    text: 'text-blue-700',   icon: Package },
  processing: { bg: 'bg-violet-50',  text: 'text-violet-700', icon: Package },
  shipped:    { bg: 'bg-indigo-50',  text: 'text-indigo-700', icon: Truck },
  delivered:  { bg: 'bg-green-50',   text: 'text-green-700',  icon: CheckCircle2 },
  cancelled:  { bg: 'bg-red-50',     text: 'text-red-700',    icon: XCircle },
};

async function getOrders(
  page: number,
  filters: { search?: string; status?: string; from?: string; to?: string }
) {
  try {
    const token = await getAccessToken();
    if (!token) return { items: [], total: 0 };
    const { sub: userId } = verifyAccessToken(token);
    const offset = (page - 1) * PAGE_SIZE;
    return await listOrders(userId, PAGE_SIZE, offset, {
      search: filters.search,
      status: filters.status,
      from: filters.from ? new Date(filters.from) : undefined,
      to: filters.to ? new Date(filters.to) : undefined,
    });
  } catch {
    return { items: [], total: 0 };
  }
}

type OrderItem = {
  orderId: string;
  quantity: number;
  unitPrice: string;
  nameBg: string | null;
  nameEn: string | null;
  imageUrl: string | null;
};

type Order = {
  id: string;
  total: string;
  status: string;
  notes: string | null;
  createdAt: string;
  items: OrderItem[];
};

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const sp = await searchParams;
  const t = await getTranslations();
  const locale = await getLocale();

  const token = await getAccessToken();
  if (!token) redirect({ href: '/login', locale });

  const page = Math.max(1, parseInt(sp.page ?? '1', 10));
  const filters = {
    search: sp.search || undefined,
    status: sp.status || undefined,
    from: sp.from || undefined,
    to: sp.to || undefined,
  };
  const hasFilters = Object.values(filters).some(Boolean);

  const { items: orderList, total } = await getOrders(page, filters);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  function formatPrice(amount: string | number) {
    return new Intl.NumberFormat(locale === 'en' ? 'en' : 'bg', {
      style: 'currency',
      currency: 'BGN',
      maximumFractionDigits: 2,
    }).format(Number(amount));
  }

  function formatDate(iso: string) {
    return new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'bg-BG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  }

  function paginationHref(nextPage: number) {
    const p = new URLSearchParams();
    p.set('page', String(nextPage));
    if (filters.search) p.set('search', filters.search);
    if (filters.status) p.set('status', filters.status);
    if (filters.from)   p.set('from', filters.from);
    if (filters.to)     p.set('to', filters.to);
    return `/orders?${p}`;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 border-b border-border pb-6">
        <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.28em] text-scarlet">
          {t('nav.shop')}
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
          {t('orders.myOrders')}
        </h1>
        {total > 0 && (
          <p className="mt-1 text-sm text-muted">
            {total}{' '}
            {locale === 'en'
              ? total === 1 ? 'order' : 'orders'
              : total === 1 ? 'поръчка' : 'поръчки'}
          </p>
        )}
      </div>

      {/* Filter bar */}
      <form method="get" className="mb-6 space-y-3">
        {/* Search row */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              name="search"
              defaultValue={sp.search ?? ''}
              placeholder={t('orders.searchPlaceholder')}
              className="h-10 w-full rounded-xl border border-border bg-surface pl-9 pr-3 text-sm text-foreground placeholder:text-muted-light focus:border-scarlet focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="flex h-10 items-center gap-1.5 rounded-xl bg-scarlet px-4 text-sm font-semibold text-white transition-colors hover:bg-scarlet-dark"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {t('common.filter')}
          </button>
          {hasFilters && (
            <Link
              href="/orders"
              className="flex h-10 items-center rounded-xl border border-border px-4 text-sm font-medium text-muted transition-colors hover:bg-cream hover:text-foreground"
            >
              {t('orders.clearFilters')}
            </Link>
          )}
        </div>

        {/* Status + date row */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <select
            name="status"
            defaultValue={sp.status ?? ''}
            className="h-10 rounded-xl border border-border bg-surface px-3 text-sm text-foreground focus:border-scarlet focus:outline-none"
          >
            <option value="">{t('orders.allStatuses')}</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`orders.status.${s}`)}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <label className="shrink-0 text-xs font-medium text-muted">{t('orders.filterFrom')}</label>
            <input
              type="date"
              name="from"
              defaultValue={sp.from ?? ''}
              className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground focus:border-scarlet focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="shrink-0 text-xs font-medium text-muted">{t('orders.filterTo')}</label>
            <input
              type="date"
              name="to"
              defaultValue={sp.to ?? ''}
              className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground focus:border-scarlet focus:outline-none"
            />
          </div>
        </div>

        {/* Active filter chips */}
        {hasFilters && (
          <div className="flex flex-wrap gap-2">
            {filters.search && (
              <span className="inline-flex items-center gap-1 rounded-full bg-scarlet/10 px-3 py-1 text-xs font-medium text-scarlet">
                {t('common.search')}: {filters.search}
              </span>
            )}
            {filters.status && (
              <span className="inline-flex items-center gap-1 rounded-full bg-scarlet/10 px-3 py-1 text-xs font-medium text-scarlet">
                {t(`orders.status.${filters.status as typeof ORDER_STATUSES[number]}`)}
              </span>
            )}
            {filters.from && (
              <span className="inline-flex items-center gap-1 rounded-full bg-scarlet/10 px-3 py-1 text-xs font-medium text-scarlet">
                {t('orders.filterFrom')}: {filters.from}
              </span>
            )}
            {filters.to && (
              <span className="inline-flex items-center gap-1 rounded-full bg-scarlet/10 px-3 py-1 text-xs font-medium text-scarlet">
                {t('orders.filterTo')}: {filters.to}
              </span>
            )}
          </div>
        )}
      </form>

      {/* Results */}
      {orderList.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-cream">
            <ShoppingBag className="h-8 w-8 text-muted" />
          </div>
          <p className="text-muted">
            {hasFilters ? t('orders.noOrdersFiltered') : t('orders.noOrders')}
          </p>
          {hasFilters ? (
            <Link
              href="/orders"
              className="mt-1 rounded-full border border-border px-5 py-2 text-sm font-medium text-muted transition-colors hover:bg-cream hover:text-foreground"
            >
              {t('orders.clearFilters')}
            </Link>
          ) : (
            <Link
              href="/shop"
              className="mt-1 rounded-full bg-scarlet px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-scarlet-dark"
            >
              {t('shop.continueShopping')}
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {(orderList as Order[]).map((order) => {
            const style = STATUS_STYLES[order.status] ?? STATUS_STYLES.pending;
            const StatusIcon = style.icon;

            return (
              <div key={order.id} className="overflow-hidden rounded-2xl border border-border bg-surface">
                {/* Order header */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-mono text-xs text-muted">
                      #{order.id.slice(0, 8).toUpperCase()}
                    </span>
                    <span className="text-xs text-muted">
                      {t('orders.orderedOn')} {formatDate(order.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${style.bg} ${style.text}`}
                    >
                      <StatusIcon className="h-3 w-3" />
                      {t(`orders.status.${order.status as typeof ORDER_STATUSES[number]}`)}
                    </span>
                    <span className="text-base font-bold text-foreground">
                      {formatPrice(order.total)}
                    </span>
                  </div>
                </div>

                {/* Items */}
                {order.items.length > 0 && (
                  <ul className="divide-y divide-border">
                    {order.items.map((item, idx) => {
                      const name = locale === 'en' ? item.nameEn : item.nameBg;
                      return (
                        <li key={idx} className="flex items-center gap-3 px-5 py-3">
                          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-cream">
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt={name ?? ''}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center">
                                <ShoppingBag className="h-4 w-4 text-muted-light" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">
                              {name ?? '—'}
                            </p>
                            <p className="text-xs text-muted">
                              {item.quantity} × {formatPrice(item.unitPrice)}
                            </p>
                          </div>
                          <span className="shrink-0 text-sm font-semibold text-foreground">
                            {formatPrice(Number(item.unitPrice) * item.quantity)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {/* Notes */}
                {order.notes && (
                  <div className="border-t border-border px-5 py-3">
                    <p className="text-xs text-muted">
                      <span className="font-medium">{t('shop.orderNotes')}:</span>{' '}
                      {order.notes}
                    </p>
                  </div>
                )}
              </div>
            );
          })}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              {page > 1 && (
                <Link
                  href={paginationHref(page - 1)}
                  className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted transition-colors hover:bg-cream hover:text-foreground"
                >
                  {t('common.previous')}
                </Link>
              )}
              <span className="text-sm text-muted">{page} / {totalPages}</span>
              {page < totalPages && (
                <Link
                  href={paginationHref(page + 1)}
                  className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted transition-colors hover:bg-cream hover:text-foreground"
                >
                  {t('common.next')}
                </Link>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
