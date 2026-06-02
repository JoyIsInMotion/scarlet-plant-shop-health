import { getLocale, getTranslations } from 'next-intl/server';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { ArrowLeft, Pencil, Leaf, Droplets, ExternalLink, History } from 'lucide-react';
import { PlantStatsChart } from '@/components/plants/plant-stats-chart';
import { PlantPhotoGallery } from '@/components/plants/plant-photo-gallery';
import { AIAnalysisButton } from '@/components/plants/ai-analysis-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from '@/i18n/navigation';
import type { Metadata } from 'next';

async function getPlant(id: string, token: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const res = await fetch(`${base}/api/plants/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const { data } = await res.json();
  return data;
}

async function getStats(id: string, token: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const res = await fetch(`${base}/api/plants/${id}/stats`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return [];
  const { data } = await res.json();
  return data?.stats ?? [];
}

async function getAnalyses(id: string, token: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const res = await fetch(`${base}/api/plants/${id}/analyses`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return [];
  const { data } = await res.json();
  return data?.analyses ?? [];
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const t = await getTranslations('plants');
  return { title: t('plantDetails') };
}

export default async function PlantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTranslations();
  const locale = await getLocale();
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value ?? '';

  const [plant, stats, analyses] = await Promise.all([
    getPlant(id, token),
    getStats(id, token),
    getAnalyses(id, token),
  ]);

  if (!plant) notFound();

  const species = plant.species;
  const speciesName = species
    ? (locale === 'en'
      ? species.commonNameEn ?? species.commonNameBg ?? species.scientificName
      : species.commonNameBg ?? species.commonNameEn ?? species.scientificName)
    : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* ── Header ── */}
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/plants"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 truncate">{plant.customName}</h1>
          {speciesName && (
            <p className="text-sm italic text-gray-500 mt-0.5">{speciesName}</p>
          )}
        </div>
        <Button variant="outline" size="sm" asChild className="rounded-full">
          <Link href={`/plants/${id}/edit`}>
            <Pencil className="h-4 w-4" />
            {t('common.edit')}
          </Link>
        </Button>
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">

        {/* Left: Photo gallery with sliding photos + health details */}
        <PlantPhotoGallery plant={plant} analyses={analyses} />

        {/* Right: Actions + info */}
        <div className="space-y-4">

          {/* AI scan */}
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{t('ai.scanButton')}</CardTitle>
                {analyses.length > 0 && (
                  <Button variant="ghost" size="sm" asChild className="rounded-full text-xs gap-1">
                    <Link href={`/plants/${id}/analyses`}>
                      <History className="h-3.5 w-3.5" />
                      {t('plants.analysisHistory')}
                    </Link>
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <AIAnalysisButton plantId={id} />
            </CardContent>
          </Card>

          {/* Care stats */}
          {stats.length > 0 ? (
            <Card className="border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">{t('plants.careStats')}</CardTitle>
              </CardHeader>
              <CardContent>
                <PlantStatsChart stats={stats} />
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed border-gray-200 bg-gray-50 shadow-none">
              <CardContent className="p-5 text-sm text-gray-500">
                <p className="font-medium text-gray-900">{t('plants.careStats')}</p>
                <p className="mt-1">{t('plants.noStats')}</p>
              </CardContent>
            </Card>
          )}

          {/* Watering + catalog meta */}
          <Card className="border-gray-200 shadow-sm">
            <CardContent className="pt-4 pb-4 space-y-2">
              {plant.lastWatered && (
                <p className="flex items-center gap-1.5 text-sm text-gray-600">
                  <Droplets className="h-4 w-4 text-blue-400" />
                  {t('plants.lastWatered')}:{' '}
                  {new Intl.DateTimeFormat(locale, {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  }).format(new Date(plant.lastWatered))}
                </p>
              )}
              {plant.speciesId && (
                <p className="flex items-center gap-1.5 text-sm text-green-600">
                  <Leaf className="h-4 w-4" />
                  {t('plants.linked')}
                  {plant.speciesConfirmed && (
                    <Badge variant="success" className="ml-1">{t('plants.speciesConfirmed')}</Badge>
                  )}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Species mini-card */}
          {species && (
            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{t('catalog.title')}</CardTitle>
                  <Button variant="ghost" size="sm" asChild className="rounded-full">
                    <Link href={`/catalog/${plant.speciesId}`} className="flex items-center gap-1 text-xs">
                      {t('catalog.viewInCatalog')}
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0 pb-4 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-xs text-gray-500">{t('catalog.scientificName')}</span>
                  <p className="italic">{species.scientificName}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">{t('catalog.careDifficulty')}</span>
                  <div className="mt-0.5">
                    <Badge variant={
                      species.careDifficulty === 'easy' ? 'success' :
                      species.careDifficulty === 'moderate' ? 'warning' : 'danger'
                    }>
                      {species.careDifficulty
                        ? t(`catalog.${species.careDifficulty as 'easy' | 'moderate' | 'difficult'}`)
                        : '—'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
