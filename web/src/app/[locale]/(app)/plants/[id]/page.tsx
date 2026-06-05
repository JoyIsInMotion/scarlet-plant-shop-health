import { getLocale, getTranslations } from 'next-intl/server';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import {
  ArrowLeft, Pencil, Leaf, Droplets, ExternalLink, History,
  CalendarDays, FlowerIcon, Wind, AlertCircle,
} from 'lucide-react';
import { PlantPhotoGallery } from '@/components/plants/plant-photo-gallery';
import { AIAnalysisButton } from '@/components/plants/ai-analysis-button';
import { LogCareButton } from '@/components/plants/log-care-button';
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

async function getSchedule(id: string, token: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const res = await fetch(`${base}/api/plants/${id}/schedule`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const { data } = await res.json();
  return data;
}

async function getRecentCareLogs(id: string, token: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const res = await fetch(`${base}/api/plants/${id}/care-logs?limit=5`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return { logs: [], total: 0 };
  const { data } = await res.json();
  return { logs: data?.logs ?? [], total: data?.total ?? 0 };
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

function daysUntil(date: string | null | undefined): number | null {
  if (!date) return null;
  const diff = new Date(date).getTime() - Date.now();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

function DueBadge({ days, locale }: { days: number | null; locale: string }) {
  if (days === null) return null;
  if (days < 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
        <AlertCircle className="h-3 w-3" />
        {locale === 'en' ? `Overdue by ${Math.abs(days)}d` : `Просрочено с ${Math.abs(days)} дни`}
      </span>
    );
  }
  if (days === 0) return <span className="text-xs font-medium text-orange-600">{locale === 'en' ? 'Due today' : 'Днес'}</span>;
  return <span className="text-xs text-gray-500">{locale === 'en' ? `in ${days} days` : `след ${days} дни`}</span>;
}

const CARE_TYPE_ICONS: Record<string, string> = {
  watered: '💧', fertilized: '🌱', repotted: '🪴',
  misted: '💦', pruned: '✂️', rotated: '🔄', observation: '👁️',
};

export default async function PlantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTranslations();
  const locale = await getLocale();
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value ?? '';

  const [plant, schedule, { logs: careLogs, total: careTotal }, analyses] = await Promise.all([
    getPlant(id, token),
    getSchedule(id, token),
    getRecentCareLogs(id, token),
    getAnalyses(id, token),
  ]);

  if (!plant) notFound();

  const species = plant.species;
  const speciesName = species
    ? (locale === 'en'
      ? species.commonNameEn ?? species.commonNameBg ?? species.scientificName
      : species.commonNameBg ?? species.commonNameEn ?? species.scientificName)
    : null;

  const waterDays  = daysUntil(schedule?.wateringNextDue);
  const fertilDays = daysUntil(schedule?.fertilizingNextDue);
  const repotDays  = daysUntil(schedule?.repottingNextDue);
  const mistDays   = schedule?.mistingNeeded ? daysUntil(schedule?.mistingNextDue) : null;

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

        {/* Left: Photo gallery */}
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

          {/* ── Care Schedule ── */}
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4 text-emerald-600" />
                  {locale === 'en' ? 'Care Schedule' : 'График за грижи'}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <LogCareButton plantId={id} locale={locale} />
                  {schedule && (
                    <Button variant="ghost" size="sm" asChild className="rounded-full text-xs">
                      <Link href={`/plants/${id}/edit`}>
                        {locale === 'en' ? 'Edit' : 'Редактирай'}
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0 pb-4 space-y-2.5">
              {schedule ? (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-gray-700">
                      <Droplets className="h-3.5 w-3.5 text-blue-400" />
                      {locale === 'en' ? 'Water' : 'Поливане'}
                      <span className="text-xs text-gray-400">({locale === 'en' ? `every ${schedule.wateringIntervalDays}d` : `на ${schedule.wateringIntervalDays} дни`})</span>
                    </span>
                    <DueBadge days={waterDays} locale={locale} />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-gray-700">
                      <Leaf className="h-3.5 w-3.5 text-green-500" />
                      {locale === 'en' ? 'Fertilize' : 'Торене'}
                      <span className="text-xs text-gray-400">({locale === 'en' ? `every ${schedule.fertilizingIntervalDays}d` : `на ${schedule.fertilizingIntervalDays} дни`})</span>
                    </span>
                    <DueBadge days={fertilDays} locale={locale} />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-gray-700">
                      <FlowerIcon className="h-3.5 w-3.5 text-purple-400" />
                      {locale === 'en' ? 'Repot' : 'Преглаждане'}
                      <span className="text-xs text-gray-400">({locale === 'en' ? `every ${schedule.repottingIntervalMonths}mo` : `на ${schedule.repottingIntervalMonths} мес`})</span>
                    </span>
                    <DueBadge days={repotDays} locale={locale} />
                  </div>
                  {schedule.mistingNeeded && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1.5 text-gray-700">
                        <Wind className="h-3.5 w-3.5 text-cyan-400" />
                        {locale === 'en' ? 'Mist' : 'Пръскане'}
                      </span>
                      <DueBadge days={mistDays} locale={locale} />
                    </div>
                  )}
                  {schedule.isCustomized && (
                    <p className="text-xs text-gray-400 pt-1">{locale === 'en' ? '✏️ Custom schedule' : '✏️ Персонализиран график'}</p>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-500">
                  {locale === 'en'
                    ? 'No schedule yet. Link a species or log care to get started.'
                    : 'Няма график. Свържете вид или запишете грижа.'}
                </p>
              )}
            </CardContent>
          </Card>

          {/* ── Care History ── */}
          {careLogs.length > 0 && (
            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{locale === 'en' ? 'Care History' : 'История на грижите'}</CardTitle>
                  {careTotal > 5 && (
                    <Button variant="ghost" size="sm" asChild className="rounded-full text-xs">
                      <Link href={`/plants/${id}/care-logs`}>
                        {locale === 'en' ? `See all (${careTotal})` : `Всички (${careTotal})`}
                      </Link>
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0 pb-2 space-y-1">
                {careLogs.map((log: { id: string; careType: string; notes?: string; loggedAt: string }) => (
                  <div key={log.id} className="flex items-center gap-2 py-1.5 border-b border-gray-50 last:border-0 text-sm">
                    <span className="text-base leading-none">{CARE_TYPE_ICONS[log.careType] ?? '🌿'}</span>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-gray-700 capitalize">{log.careType}</span>
                      {log.notes && <p className="text-xs text-gray-400 truncate">{log.notes}</p>}
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short' }).format(new Date(log.loggedAt))}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Last watered + catalog meta */}
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
