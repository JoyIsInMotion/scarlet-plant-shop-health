import { getTranslations } from 'next-intl/server';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { Plus, Leaf } from 'lucide-react';
import { PlantCard } from '@/components/plants/plant-card';
import { Pagination } from '@/components/ui/pagination';
import { Button } from '@/components/ui/button';
import type { Metadata } from 'next';
import type { Plant } from '@scarlet/shared';

const PAGE_SIZE = 12;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('nav');
  return { title: t('dashboard') };
}

async function getPlants(accessToken: string, offset: number) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const res = await fetch(
    `${baseUrl}/api/plants?limit=${PAGE_SIZE}&offset=${offset}`,
    { headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store' },
  );
  if (!res.ok) return { plants: [], total: 0 };
  const { data } = await res.json();
  return {
    plants: (data?.plants ?? []) as (Plant & { species?: { commonNameBg: string | null } | null })[],
    total: (data?.total ?? 0) as number,
  };
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const t = await getTranslations();
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? '1', 10));
  const offset = (page - 1) * PAGE_SIZE;

  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value ?? '';

  const { plants, total } = await getPlants(token, offset);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('plants.myPlants')}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {total} {total === 1 ? 'растение' : 'растения'}
          </p>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link href="/plants/new" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            {t('plants.addPlant')}
          </Link>
        </Button>
      </div>

      {/* Empty state */}
      {total === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-2xl border border-gray-200">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-50 mb-4">
            <Leaf className="h-8 w-8 text-green-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{t('plants.noPlants')}</h3>
          <p className="text-sm text-gray-500 mb-6 max-w-xs">{t('plants.addFirstPlant')}</p>
          <Button asChild>
            <Link href="/plants/new" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              {t('plants.addPlant')}
            </Link>
          </Button>
        </div>
      ) : (
        <>
          {/* Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-5 lg:grid-cols-3 xl:grid-cols-4">
            {plants.map((plant) => (
              <PlantCard
                key={plant.id}
                plant={{
                  ...plant,
                  speciesName: plant.species?.commonNameBg ?? null,
                }}
              />
            ))}
          </div>

          {/* Pagination */}
          {total > PAGE_SIZE && (
            <div className="mt-10 flex flex-col items-center gap-2">
              <Pagination
                page={page}
                total={total}
                limit={PAGE_SIZE}
                getHref={(p) => `?page=${p}`}
              />
              <p className="text-xs text-gray-400">
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} от {total}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
