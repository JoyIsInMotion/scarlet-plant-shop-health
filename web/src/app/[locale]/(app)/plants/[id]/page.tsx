import { getLocale, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import {
  ArrowLeft, Pencil, ExternalLink, History,
} from 'lucide-react';
import { PlantPhotoGallery } from '@/components/plants/plant-photo-gallery';
import { AIAnalysisButton } from '@/components/plants/ai-analysis-button';
import { PlantCareSection } from '@/components/plants/plant-care-section';
import { CareHistoryCollapsible } from '@/components/plants/care-history-collapsible';
import { DeletePlantButton } from '@/components/plants/delete-plant-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getAccessToken } from '@/lib/auth/cookies';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { getAIScansRemaining } from '@/lib/ai/rate-limit';
import * as plantsService from '@/services/plants.service';
import * as careService from '@/services/care.service';
import { Link } from '@/i18n/navigation';
import type { AIAnalysis } from '@scarlet/shared';
import type { Metadata } from 'next';

// These read the DB directly via the services (same path the REST routes use)
// instead of the page self-fetching its own /api over HTTP. Self-invocation —
// especially 4 concurrent calls — is unreliable on Netlify's serverless runtime
// and was crashing this page. Secondary loads swallow ServiceError so an admin
// viewing another user's plant (allowed by getPlant, denied by the owner-scoped
// schedule/care/analyses queries) gets empty sections rather than a crash.
async function getPlant(id: string, userId: string, role: string) {
  try {
    return await plantsService.getPlant(id, userId, role);
  } catch {
    return null;
  }
}

async function getSchedule(id: string, userId: string) {
  try {
    return await careService.getSchedule(id, userId);
  } catch {
    return null;
  }
}

async function getRecentCareLogs(id: string, userId: string) {
  try {
    const { logs, total } = await careService.listCareLogs(id, userId, { limit: 5, offset: 0 });
    return { logs, total };
  } catch {
    return { logs: [], total: 0 };
  }
}

async function getScansRemaining(userId: string, role: string): Promise<number | null> {
  try {
    return await getAIScansRemaining(userId, role as 'user' | 'admin');
  } catch {
    return null;
  }
}

async function getAnalyses(id: string, userId: string): Promise<AIAnalysis[]> {
  try {
    const { analyses } = await plantsService.getAnalyses(id, userId, 10, 0);
    // Service returns raw DB rows; their runtime shape matches the serialized
    // AIAnalysis the gallery consumes (the REST route returns the same rows).
    return analyses as unknown as AIAnalysis[];
  } catch {
    return [];
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('plants');
  return { title: t('plantDetails') };
}

function daysUntil(date: string | Date | null | undefined): number | null {
  if (!date) return null;
  const diff = new Date(date).getTime() - Date.now();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

export default async function PlantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTranslations();
  const locale = await getLocale();

  const token = await getAccessToken();
  let auth: { sub: string; role: string } | null = null;
  try {
    auth = token ? verifyAccessToken(token) : null;
  } catch {
    auth = null;
  }
  if (!auth) notFound();

  const [plant, schedule, { logs: careLogs, total: careTotal }, analyses, scansRemaining] = await Promise.all([
    getPlant(id, auth.sub, auth.role),
    getSchedule(id, auth.sub),
    getRecentCareLogs(id, auth.sub),
    getAnalyses(id, auth.sub),
    getScansRemaining(auth.sub, auth.role),
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
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild className="rounded-full">
            <Link href={`/plants/${id}/edit`}>
              <Pencil className="h-4 w-4" />
              {t('common.edit')}
            </Link>
          </Button>
          <DeletePlantButton plantId={id} />
        </div>
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">

        {/* Left: Photo gallery */}
        <PlantPhotoGallery plant={plant} analyses={analyses} />

        {/* Right: Actions + info */}
        <div className="space-y-4">

          {/* AI scan */}
          <Card id="ai-scan-card" className="border-gray-200 shadow-sm scroll-mt-20">
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
              <AIAnalysisButton plantId={id} latestAnalysis={analyses[0] ?? null} scansRemaining={scansRemaining} />
            </CardContent>
          </Card>

          {/* ── Care Section (Schedule + Logger) ── */}
          <PlantCareSection
            plantId={id}
            schedule={schedule}
            waterDays={waterDays}
            fertilDays={fertilDays}
            repotDays={repotDays}
            mistDays={mistDays}
          />

          {/* ── Care History (Collapsible) ── */}
          <CareHistoryCollapsible
            careLogs={careLogs}
            careTotal={careTotal}
            locale={locale}
            plantId={id}
          />

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
