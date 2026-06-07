import { getLocale, getTranslations } from 'next-intl/server';
import { ArrowLeft } from 'lucide-react';
import { Link, redirect } from '@/i18n/navigation';
import { getAccessToken } from '@/lib/auth/cookies';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { listAllProducts } from '@/services/products.service';
import { ProductManager } from '@/components/admin/product-manager';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin');
  return { title: t('manageProducts') };
}

export default async function AdminProductsPage() {
  const t = await getTranslations();
  const locale = await getLocale();

  const token = await getAccessToken();
  let isAdmin = false;
  if (token) {
    try { isAdmin = (await verifyAccessToken(token)).role === 'admin'; } catch { /* not admin */ }
  }
  if (!isAdmin) redirect({ href: '/', locale });

  const { items } = await listAllProducts({ limit: 100, offset: 0 });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin" className="rounded-lg border border-border p-2 text-muted transition-colors hover:bg-cream">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <p className="text-xs uppercase tracking-widest text-muted">{t('admin.title')}</p>
          <h1 className="text-2xl font-bold text-gray-900">{t('admin.manageProducts')}</h1>
        </div>
      </div>

      <ProductManager products={items} locale={locale} />
    </div>
  );
}
