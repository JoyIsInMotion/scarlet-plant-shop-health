import { getLocale, getTranslations } from 'next-intl/server';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { ArrowLeft, BrainCircuit, Leaf } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HealthScoreRing } from '@/components/plants/health-score-ring';
import { AnalysisTrendChart } from '@/components/plants/analysis-trend-chart';
import type { Metadata } from 'next';
import type { AIAnalysis, Plant } from '@scarlet/shared';

async function getPlant(id: string, token: string): Promise<Plant | null> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const res = await fetch(`${base}/api/plants/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const { data } = await res.json();
  return data ?? null;
}

async function fetchAnalyses(id: string, token: string): Promise<AIAnalysis[]> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const res = await fetch(`${base}/api/plants/${id}/analyses?limit=50`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return [];
  const { data } = await res.json();
  return data?.analyses ?? [];
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('analyses');
  return { title: t('title') };
}

const SEVERITY_DOT: Record<string, string> = {
  high: 'bg-red-500',
  medium: 'bg-yellow-400',
  low: 'bg-green-500',
};

export default async function AnalysesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations();
  const locale = await getLocale();
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value ?? '';

  const [plant, analyses] = await Promise.all([
    getPlant(id, token),
    fetchAnalyses(id, token),
  ]);

  if (!plant) notFound();

  const species = (plant as Plant & { species?: { commonNameBg?: string | null; commonNameEn?: string | null; scientificName: string } | null }).species;
  const speciesName = species
    ? locale === 'en'
      ? species.commonNameEn ?? species.commonNameBg ?? species.scientificName
      : species.commonNameBg ?? species.commonNameEn ?? species.scientificName
    : null;

  const scoredCount = analyses.filter((a) => a.healthScore != null).length;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/plants/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 truncate">{t('analyses.title')}</h1>
          <p className="text-sm text-gray-500 mt-0.5 truncate">
            {plant.customName}
            {speciesName ? ` · ${speciesName}` : ''}
          </p>
        </div>
        <Badge variant="secondary" className="flex-shrink-0 rounded-full">
          {analyses.length} {t('analyses.scans')}
        </Badge>
      </div>

      {analyses.length === 0 ? (
        <Card className="border-dashed border-gray-200 bg-gray-50 shadow-none">
          <CardContent className="py-16 flex flex-col items-center gap-3 text-center">
            <BrainCircuit className="h-10 w-10 text-gray-300" />
            <p className="font-medium text-gray-900">{t('analyses.noAnalyses')}</p>
            <p className="text-sm text-gray-500 max-w-xs">{t('analyses.noAnalysesDesc')}</p>
            <Button asChild className="mt-2 rounded-full">
              <Link href={`/plants/${id}`}>{t('analyses.goToPlant')}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Health score trend chart */}
          {scoredCount >= 2 && (
            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{t('analyses.healthTrend')}</CardTitle>
              </CardHeader>
              <CardContent>
                <AnalysisTrendChart analyses={analyses} />
              </CardContent>
            </Card>
          )}

          {/* Analysis cards */}
          <div className="grid gap-4 md:grid-cols-2">
            {analyses.map((analysis) => {
              const issues = analysis.issues ?? [];
              const recs = analysis.careRecommendations ?? [];
              const date = new Intl.DateTimeFormat(locale, {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              }).format(new Date(analysis.analyzedAt));

              return (
                <Card key={analysis.id} className="border-gray-200 shadow-sm overflow-hidden">
                  <CardContent className="p-4 space-y-3">
                    {/* Top row: date + confidence */}
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-gray-500">{date}</p>
                      {analysis.confidence && (
                        <Badge variant="secondary" className="text-xs rounded-full">
                          {t(`ai.confidence.${analysis.confidence}`)}
                        </Badge>
                      )}
                    </div>

                    {/* Score + condition */}
                    <div className="flex items-center gap-3">
                      {analysis.healthScore != null && (
                        <HealthScoreRing score={analysis.healthScore} size={52} />
                      )}
                      <div className="min-w-0">
                        {analysis.overallCondition && (
                          <p className="text-sm font-semibold text-gray-900">
                            {t(`ai.statusMessage.${analysis.overallCondition}`)}
                          </p>
                        )}
                        {analysis.identifiedCommonName && (
                          <p className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                            <Leaf className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{analysis.identifiedCommonName}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Issues */}
                    {issues.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {issues.map((issue, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full"
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${SEVERITY_DOT[issue.severity] ?? 'bg-gray-400'}`}
                            />
                            {issue.name}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Recommendations count */}
                    {recs.length > 0 && issues.length === 0 && (
                      <p className="text-xs text-green-600">
                        {recs.length} {t('ai.careRecommendations').toLowerCase()}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
