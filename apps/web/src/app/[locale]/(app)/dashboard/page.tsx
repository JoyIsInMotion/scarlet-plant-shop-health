import { getTranslations } from 'next-intl/server';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { PlantCard } from '@/components/plants/plant-card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { Metadata } from 'next';
import type { Plant } from '@scarlet/shared';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('nav');
  return { title: t('dashboard') };
}

async function getPlants(accessToken: string): Promise<(Plant & { species?: { commonNameBg: string | null } })[]> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const res = await fetch(`${baseUrl}/api/plants?limit=20`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  if (!res.ok) return [];
  const { data } = await res.json();
  return data?.plants ?? [];
}

export default async function DashboardPage() {
  const t = await getTranslations();
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value ?? '';

  const plants = await getPlants(token);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('plants.myPlants')}</h1>
          <p className="text-sm text-gray-500 mt-1">{plants.length} {plants.length === 1 ? 'растение' : 'растения'}</p>
        </div>
        <Button asChild>
          <Link href="plants/new">
            <Plus className="h-4 w-4" />
            {t('plants.addPlant')}
          </Link>
        </Button>
      </div>

      {plants.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <div className="text-5xl mb-4">🌱</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('plants.noPlants')}</h3>
          <p className="text-sm text-gray-500 mb-6">{t('plants.addFirstPlant')}</p>
          <Button asChild>
            <Link href="plants/new">
              <Plus className="h-4 w-4" />
              {t('plants.addPlant')}
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
      )}
    </div>
  );
}
