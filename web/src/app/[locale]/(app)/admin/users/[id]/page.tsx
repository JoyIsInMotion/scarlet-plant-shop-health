import { getLocale, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { ArrowLeft, Mail, Phone, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { Link, redirect } from '@/i18n/navigation';
import { getAccessToken } from '@/lib/auth/cookies';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { getUserById } from '@/services/users.service';
import { listOrders } from '@/services/orders.service';
import { OrderRowActions } from '@/components/admin/order-row-actions';
import { UserAdminActions } from '@/components/admin/user-admin-actions';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin');
  return { title: t('userDetails') };
}

export default async function AdminUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTranslations();
  const locale = await getLocale();

  const token = await getAccessToken();
  let isAdmin = false;
  if (token) {
    try { isAdmin = (await verifyAccessToken(token)).role === 'admin'; } catch { /* not admin */ }
  }
  if (!isAdmin) redirect({ href: '/', locale });

  let user;
  try {
    user = await getUserById(id);
  } catch {
    notFound();
  }

  const { items: orders } = await listOrders(id, 50, 0);

  const formatPrice = (amount: string | number) =>
    new Intl.NumberFormat(locale === 'en' ? 'en' : 'bg', { style: 'currency', currency: 'BGN' }).format(Number(amount));
  const formatDate = (iso: string | Date) =>
    new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'bg-BG', { day: 'numeric', month: 'short', year: '2-digit' }).format(new Date(iso));

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin" className="rounded-lg border border-border p-2 text-muted transition-colors hover:bg-cream">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <p className="text-xs uppercase tracking-widest text-muted">{t('admin.title')}</p>
          <h1 className="text-2xl font-bold text-gray-900">{t('admin.userDetails')}</h1>
        </div>
      </div>

      <div className="space-y-4">
        {/* Profile */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <Avatar src={user.avatarUrl} fallback={user.name} size="xl" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-lg font-semibold text-gray-900">{user.name}</p>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {user.role}
                  </span>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {user.isActive ? t('admin.active') : t('admin.inactive')}
                  </span>
                </div>
                <div className="mt-2 space-y-1 text-sm text-gray-500">
                  <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" />{user.email}</p>
                  <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" />{user.phone ?? '—'}</p>
                  <p className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5" />{formatDate(user.createdAt)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Admin actions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('admin.manageUsers')}</CardTitle>
          </CardHeader>
          <CardContent>
            <UserAdminActions userId={user.id} role={user.role} isActive={user.isActive} phone={user.phone} />
          </CardContent>
        </Card>

        {/* Orders */}
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="font-semibold text-gray-900">{t('admin.userOrders')}</h2>
              <span className="text-sm text-gray-500">{orders.length}</span>
            </div>
            {orders.length === 0 ? (
              <p className="px-6 py-12 text-center text-sm text-muted">{t('admin.noUserOrders')}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      <th className="px-4 py-3">{t('admin.order')}</th>
                      <th className="px-4 py-3">{t('admin.items')}</th>
                      <th className="px-4 py-3">{t('shop.total')}</th>
                      <th className="px-4 py-3">{t('orders.orderedOn')}</th>
                      <th className="px-4 py-3 text-right">{t('admin.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {orders.map((o) => (
                      <tr key={o.id} className="hover:bg-gray-50/60">
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">#{o.id.slice(0, 8).toUpperCase()}</td>
                        <td className="px-4 py-3 text-gray-500">{o.items.length}</td>
                        <td className="px-4 py-3 font-semibold text-gray-900">{formatPrice(o.total)}</td>
                        <td className="px-4 py-3 text-gray-500">{formatDate(o.createdAt)}</td>
                        <td className="px-4 py-3">
                          <OrderRowActions orderId={o.id} status={o.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
