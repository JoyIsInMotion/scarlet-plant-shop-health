import { getTranslations } from 'next-intl/server';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Pencil, Leaf, Droplets, ExternalLink } from 'lucide-react';
import { PlantStatsChart } from '@/components/plants/plant-stats-chart';
import { HealthScoreRing } from '@/components/plants/health-score-ring';
import { AIAnalysisButton } from '@/components/plants/ai-analysis-button';
import { AIAnalysisHistory } from '@/components/plants/ai-analysis-history';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  return { title: 'Plant Details' };
}

export default async function PlantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTranslations();
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value ?? '';

  const [plant, stats, analyses] = await Promise.all([
    getPlant(id, token),
    getStats(id, token),
    getAnalyses(id, token),
  ]);

  if (!plant) notFound();

  const species = plant.species;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      {/* Back + title */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link href="dashboard"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 truncate">{plant.customName}</h1>
          {species && (
            <p className="text-sm italic text-gray-500 mt-0.5">{species.commonNameBg ?? species.commonNameEn}</p>
          )}
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/plants/${id}/edit`}>
            <Pencil className="h-4 w-4" />
            {t('common.edit')}
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Image + Health */}
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <div className="aspect-[4/3] bg-gray-100 relative">
              {plant.imageUrl ? (
                <img src={plant.imageUrl} alt={plant.customName} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <Leaf className="h-16 w-16 text-gray-300" />
                </div>
              )}
            </div>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  {plant.lastWatered && (
                    <p className="flex items-center gap-1.5 text-sm text-gray-600">
                      <Droplets className="h-4 w-4 text-blue-400" />
                      {t('plants.lastWatered')}: {new Date(plant.lastWatered).toLocaleDateString('bg-BG')}
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
                </div>
                <HealthScoreRing score={plant.healthScore} size={72} />
              </div>
            </CardContent>
          </Card>

          {/* Species card */}
          {species && (
            <Card>
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{t('catalog.title')}</CardTitle>
                  <Button variant="ghost" size="sm" asChild>
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
                      {species.careDifficulty ? t(`catalog.${species.careDifficulty as 'easy' | 'moderate' | 'difficult'}`) : '—'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* AI Scan */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('ai.scanButton')}</CardTitle>
            </CardHeader>
            <CardContent>
              <AIAnalysisButton plantId={id} />
            </CardContent>
          </Card>

          {/* Stats chart */}
          {stats.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('plants.careStats')}</CardTitle>
              </CardHeader>
              <CardContent>
                <PlantStatsChart stats={stats} />
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Analysis history */}
      {analyses.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">{t('plants.analysisHistory')}</h2>
          <AIAnalysisHistory analyses={analyses} />
        </div>
      )}
    </div>
  );
}
