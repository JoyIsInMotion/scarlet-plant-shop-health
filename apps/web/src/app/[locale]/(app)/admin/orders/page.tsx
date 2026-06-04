import { getLocale, getTranslations } from 'next-intl/server';
import { ArrowLeft, Clock, CheckCircle2, Truck, XCircle, Package, Search, SlidersHorizontal } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Pagination } from '@/components/ui/pagination';
import { Link, redirect } from '@/i18n/navigation';
import { getAccessToken } from '@/lib/auth/cookies';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { listAllOrders } from '@/services/orders.service';
import { OrderRowActions } from '@/components/admin/order-row-actions';
import type { Metadata } from 'next';

const PAGE_SIZE = 20;

const ORDER_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'] as const;

const STATUS_STYLES: Record<string, { bg: string; text: string; icon: React.ComponentType<{ className?: string }> }> = {
  pending:    { bg: 'bg-amber-50',  text: 'text-amber-700',  icon: Clock },
  confirmed:  { bg: 'bg-blue-50',   text: 'text-blue-700',   icon: Package },
  processing: { bg: 'bg-violet-50', text: 'text-violet-700', icon: Package },
  shipped:    { bg: 'bg-indigo-50', text: 'text-indigo-700', icon: Truck },
  delivered:  { bg: 'bg-green-50',  text: 'text-green-700',  icon: CheckCircle2 },
  cancelled:  { bg: 'bg-red-50',    text: 'text-red-700',    icon: XCircle },
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin');
  return { title: t('manageOrders') };
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const t = await getTranslations();
  const locale = await getLocale();

  // Admin guard
  const token = await getAccessToken();
  let isAdmin = false;
  if (token) {
    try { isAdmin = (await verifyAccessToken(token)).role === 'admin'; } catch { /* not admin */ }
  }
  if (!isAdmin) redirect({ href: '/', locale });

  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? '1', 10));
  const filters = { search: sp.search || undefined, status: sp.status || undefined };

  const { items: orders, total: orderTotal } = await listAllOrders(
    PAGE_SIZE,
    (page - 1) * PAGE_SIZE,
    { search: filters.search, status: filters.status }
  );

  const formatPrice = (amount: string | number) =>
    new Intl.NumberFormat(locale === 'en' ? 'en' : 'bg', { style: 'currency', currency: 'BGN' }).format(Number(amount));
  const formatDate = (iso: string | Date) =>
    new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'bg-BG', { day: 'numeric', month: 'short', year: '2-digit' }).format(new Date(iso));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin" className="rounded-lg border border-border p-2 text-muted transition-colors hover:bg-cream">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <p className="text-xs uppercase tracking-widest text-muted">{t('admin.title')}</p>
          <h1 className="text-2xl font-bold text-gray-900">{t('admin.manageOrders')}</h1>
        </div>
      </div>

      {/* Filters */}
      <form method="get" className="mb-5 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            name="search"
            defaultValue={sp.search ?? ''}
            placeholder={t('orders.searchPlaceholder')}
            className="h-10 w-full rounded-xl border border-border bg-surface pl-9 pr-3 text-sm text-foreground placeholder:text-muted-light focus:border-scarlet focus:outline-none"
          />
        </div>
        <select
          name="status"
          defaultValue={sp.status ?? ''}
          className="h-10 rounded-xl border border-border bg-surface px-3 text-sm text-foreground focus:border-scarlet focus:outline-none"
        >
          <option value="">{t('orders.allStatuses')}</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>{t(`orders.status.${s}`)}</option>
          ))}
        </select>
        <button
          type="submit"
          className="flex h-10 items-center gap-1.5 rounded-xl bg-scarlet px-4 text-sm font-semibold text-white transition-colors hover:bg-scarlet-dark"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          {t('common.filter')}
        </button>
      </form>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <h2 className="font-semibold text-gray-900">{t('admin.manageOrders')}</h2>
            <span className="text-sm text-gray-500">{orderTotal} {t('admin.totalOrders').toLowerCase()}</span>
          </div>

          {orders.length === 0 ? (
            <p className="px-6 py-16 text-center text-sm text-muted">{t('orders.noOrdersFiltered')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    <th className="px-4 py-3">{t('admin.order')}</th>
                    <th className="px-4 py-3">{t('admin.customer')}</th>
                    <th className="px-4 py-3">{t('admin.items')}</th>
                    <th className="px-4 py-3">{t('shop.total')}</th>
                    <th className="px-4 py-3">{t('orders.orderedOn')}</th>
                    <th className="px-4 py-3">{t('admin.status')}</th>
                    <th className="px-4 py-3 text-right">{t('admin.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {orders.map((o) => {
                    const style = STATUS_STYLES[o.status] ?? STATUS_STYLES.pending;
                    const StatusIcon = style.icon;
                    return (
                      <tr key={o.id} className="hover:bg-gray-50/60">
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">#{o.id.slice(0, 8).toUpperCase()}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{o.userName ?? '—'}</div>
                          <div className="text-xs text-gray-400">{o.userEmail ?? ''}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{o.items.length}</td>
                        <td className="px-4 py-3 font-semibold text-gray-900">{formatPrice(o.total)}</td>
                        <td className="px-4 py-3 text-gray-500">{formatDate(o.createdAt)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${style.bg} ${style.text}`}>
                            <StatusIcon className="h-3 w-3" />
                            {t(`orders.status.${o.status as typeof ORDER_STATUSES[number]}`)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <OrderRowActions orderId={o.id} status={o.status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="border-t border-gray-100 px-6 py-4">
            <Pagination
              page={page}
              total={orderTotal}
              limit={PAGE_SIZE}
              getHref={(p) => {
                const params = new URLSearchParams();
                if (filters.search) params.set('search', filters.search);
                if (filters.status) params.set('status', filters.status);
                params.set('page', String(p));
                return `?${params.toString()}`;
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
