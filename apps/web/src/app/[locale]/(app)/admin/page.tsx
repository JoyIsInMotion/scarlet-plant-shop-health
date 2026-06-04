import { getTranslations } from 'next-intl/server';
import { cookies } from 'next/headers';
import { Users, Leaf, ShoppingBag, ScanLine, TrendingUp, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Pagination } from '@/components/ui/pagination';
import { Link } from '@/i18n/navigation';
import type { Metadata } from 'next';

const PAGE_SIZE = 20;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin');
  return { title: t('title') };
}

async function getAdminStats(token: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const res = await fetch(`${base}/api/admin/stats`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const { data } = await res.json();
  return data;
}

async function getUsers(token: string, page: number) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const res = await fetch(`${base}/api/users?limit=${PAGE_SIZE}&page=${page}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return { users: [], total: 0 };
  const { data } = await res.json();
  return { users: data?.users ?? [], total: data?.total ?? 0 };
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const t = await getTranslations();
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? '1', 10));
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value ?? '';

  const [stats, { users, total }] = await Promise.all([
    getAdminStats(token),
    getUsers(token, page),
  ]);

  const statCards = [
    { label: t('admin.totalUsers'),  value: stats?.totalUsers ?? 0,                           icon: Users,       color: 'text-blue-600 bg-blue-50' },
    { label: t('admin.totalPlants'), value: stats?.totalPlants ?? 0,                          icon: Leaf,        color: 'text-green-600 bg-green-50' },
    { label: t('admin.totalOrders'), value: stats?.totalOrders ?? 0,                          icon: ShoppingBag, color: 'text-purple-600 bg-purple-50' },
    { label: t('admin.aiScansToday'), value: stats?.aiScansToday ?? 0,                        icon: ScanLine,    color: 'text-orange-600 bg-orange-50' },
    { label: t('admin.revenue'),     value: `${Number(stats?.revenue ?? 0).toFixed(2)} лв.`,  icon: TrendingUp,  color: 'text-red-600 bg-red-50' },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('admin.title')}</h1>

      {/* Stats overview */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 mb-8">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-4">
              <div className={`inline-flex rounded-lg p-2 mb-3 ${s.color}`}>
                <s.icon className="h-5 w-5" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Management links */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link
          href="/admin/orders"
          className="group flex items-center justify-between rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-scarlet/40 hover:bg-cream"
        >
          <div className="flex items-center gap-3">
            <div className="inline-flex rounded-lg bg-purple-50 p-2 text-purple-600">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">{t('admin.manageOrders')}</p>
              <p className="text-xs text-gray-500">{stats?.totalOrders ?? 0} {t('admin.totalOrders').toLowerCase()}</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {/* Users table */}
      <Card>
        <CardContent className="p-0">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">{t('admin.users')}</h2>
            <span className="text-sm text-gray-500">{total} total</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{t('auth.name')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{t('auth.email')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u: { id: string; name: string; email: string; role: string; isActive: boolean }) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium text-gray-900">{u.name}</td>
                    <td className="px-6 py-3 text-gray-500">{u.email}</td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4 border-t border-gray-100">
            <Pagination
              page={page}
              total={total}
              limit={PAGE_SIZE}
              getHref={(p) => `?page=${p}`}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
