import { getLocale, getTranslations } from 'next-intl/server';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PlantCard } from '@/components/plants/plant-card';
import { Pagination } from '@/components/ui/pagination';
import { getAccessToken } from '@/lib/auth/cookies';
import { Link } from '@/i18n/navigation';

const PAGE_SIZE = 12;

async function getPlants(page: number) {
  try {
    const token = await getAccessToken();
    if (!token) return { plants: [], total: 0 };

    const offset = (page - 1) * PAGE_SIZE;
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/plants?limit=${PAGE_SIZE}&offset=${offset}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) return { plants: [], total: 0 };
    const response = await res.json();
    return {
      plants: Array.isArray(response.data?.plants) ? response.data.plants : [],
      total: response.data?.total ?? 0,
    };
  } catch {
    return { plants: [], total: 0 };
  }
}

export default async function PlantsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const sp = await searchParams;
  const t = await getTranslations();
  const locale = await getLocale();
  const page = Math.max(1, parseInt(sp.page ?? '1', 10));

  const { plants, total } = await getPlants(page);

  return (
    <div className="min-h-[calc(100vh-4rem-16rem)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-white via-white to-emerald-50 p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-600">{t('plants.myPlants')}</p>
              <h1 className="text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">{t('plants.myPlants')}</h1>
              <p className="text-sm leading-6 text-gray-600 sm:text-base">{t('plants.manageCollection')}</p>
              <p className="text-sm font-medium text-gray-500">
                {total} {locale === 'en' ? 'plants' : 'растения'}
              </p>
            </div>
            <Button asChild className="rounded-full px-5 shadow-sm">
              <Link href="/plants/new" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                {t('plants.addPlant')}
              </Link>
            </Button>
          </div>
        </div>

        {plants.length === 0 && page === 1 ? (
          <div className="rounded-3xl border border-dashed border-gray-200 bg-white py-16 text-center">
            <p className="text-gray-500 mb-4">{t('plants.noPlants')}</p>
            <Button asChild className="rounded-full">
              <Link href="/plants/new">{t('plants.addFirstPlant')}</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {plants.map((plant: any) => (
                <PlantCard key={plant.id} plant={plant} />
              ))}
            </div>
            <Pagination
              page={page}
              total={total}
              limit={PAGE_SIZE}
              getHref={(p) => `?page=${p}`}
              className="mt-4"
            />
          </>
        )}
      </div>
    </div>
  );
}
