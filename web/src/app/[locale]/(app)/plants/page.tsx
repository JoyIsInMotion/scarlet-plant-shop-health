import { getLocale, getTranslations } from 'next-intl/server';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PlantCard } from '@/components/plants/plant-card';
import { PlantFilters } from '@/components/plants/plant-filters';
import { Pagination } from '@/components/ui/pagination';
import { getAccessToken } from '@/lib/auth/cookies';
import { Link } from '@/i18n/navigation';

const PAGE_SIZE = 12;

async function getPlants(
  page: number,
  search?: string,
  difficulty?: string,
) {
  try {
    const token = await getAccessToken();
    if (!token) return { plants: [], total: 0 };

    const offset = (page - 1) * PAGE_SIZE;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
    if (search) params.set('search', search);
    if (difficulty) params.set('difficulty', difficulty);

    const res = await fetch(`${baseUrl}/api/plants?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
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
  const search = sp.search ?? '';
  const difficulty = sp.difficulty ?? '';

  const { plants, total } = await getPlants(page, search || undefined, difficulty || undefined);

  const isFiltering = search.length > 0 || difficulty.length > 0;

  return (
    <div className="min-h-[calc(100vh-4rem-16rem)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* ── Hero header ── */}
        <div className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-white via-white to-emerald-50 p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-600">
                {t('plants.myPlants')}
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
                {t('plants.myPlants')}
              </h1>
              <p className="text-sm leading-6 text-gray-600 sm:text-base">
                {t('plants.manageCollection')}
              </p>
              {!isFiltering && (
                <p className="text-sm font-medium text-gray-500">
                  {total} {locale === 'en' ? 'plants' : 'растения'}
                </p>
              )}
            </div>
            <Button asChild className="rounded-full px-5 shadow-sm">
              <Link href="/plants/new" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                {t('plants.addPlant')}
              </Link>
            </Button>
          </div>
        </div>

        {/* ── Search + filters ── */}
        <PlantFilters
          initialSearch={search}
          initialDifficulty={difficulty}
          allParams={sp}
        />

        {/* ── Results count when filtering ── */}
        {isFiltering && (
          <p className="text-sm font-medium text-gray-500">
            {total} {locale === 'en' ? 'plants' : 'растения'}
          </p>
        )}

        {/* ── Grid or empty state ── */}
        {plants.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-gray-200 bg-white py-16 text-center">
            {isFiltering ? (
              <p className="text-gray-500">{t('common.noResults')}</p>
            ) : (
              <>
                <p className="text-gray-500 mb-4">{t('plants.noPlants')}</p>
                <Button asChild className="rounded-full">
                  <Link href="/plants/new">{t('plants.addFirstPlant')}</Link>
                </Button>
              </>
            )}
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
              getHref={(p) => {
                const params = new URLSearchParams();
                if (search) params.set('search', search);
                if (difficulty) params.set('difficulty', difficulty);
                params.set('page', String(p));
                return `?${params.toString()}`;
              }}
              className="mt-4"
            />
          </>
        )}
      </div>
    </div>
  );
}
