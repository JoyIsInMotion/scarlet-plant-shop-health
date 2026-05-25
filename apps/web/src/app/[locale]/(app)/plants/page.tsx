import { getLocale, getTranslations } from 'next-intl/server';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PlantCard } from '@/components/plants/plant-card';
import { getAccessToken } from '@/lib/auth/cookies';
import { Link } from '@/i18n/navigation';

async function getPlants() {
  try {
    const token = await getAccessToken();
    if (!token) return [];

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/plants?limit=100`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    if (!res.ok) return [];
    const response = await res.json();
    const plants = response.data?.plants;
    return Array.isArray(plants) ? plants : [];
  } catch {
    return [];
  }
}

export default async function PlantsPage() {
  const t = await getTranslations();
  const locale = await getLocale();
  const plants = await getPlants();

  return (
    <div className="min-h-[calc(100vh-4rem-16rem)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-white via-white to-emerald-50 p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-600">{t('plants.myPlants')}</p>
              <h1 className="text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">{t('plants.myPlants')}</h1>
              <p className="text-sm leading-6 text-gray-600 sm:text-base">{t('plants.manageCollection')}</p>
              <p className="text-sm font-medium text-gray-500">{plants.length} {locale === 'en' ? 'plants' : 'растения'}</p>
            </div>
            <Button asChild className="rounded-full px-5 shadow-sm">
              <Link href="/plants/new" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                {t('plants.addPlant')}
              </Link>
            </Button>
          </div>
        </div>

        {plants.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-gray-200 bg-white py-16 text-center">
            <p className="text-gray-500 mb-4">{t('plants.noPlants')}</p>
            <Button asChild className="rounded-full">
              <Link href="/plants/new">{t('plants.addFirstPlant')}</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {plants.map((plant) => (
              <PlantCard key={plant.id} plant={plant} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
