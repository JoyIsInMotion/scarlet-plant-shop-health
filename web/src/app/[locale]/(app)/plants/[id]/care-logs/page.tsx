import { getLocale, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { ArrowLeft, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Pagination } from '@/components/ui/pagination';
import { PlantCareSection } from '@/components/plants/plant-care-section';
import { CareLogList } from '@/components/plants/care-log-list';
import { getAccessToken } from '@/lib/auth/cookies';
import { verifyAccessToken } from '@/lib/auth/jwt';
import * as plantsService from '@/services/plants.service';
import * as careService from '@/services/care.service';
import { Link } from '@/i18n/navigation';
import type { Metadata } from 'next';

const PAGE_SIZE = 20;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('plants');
  return { title: t('careStats') };
}

function daysUntil(date: string | Date | null | undefined): number | null {
  if (!date) return null;
  const diff = new Date(date).getTime() - Date.now();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

export default async function CareLogsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? '1', 10));
  const locale = await getLocale();
  const en = locale === 'en';

  const token = await getAccessToken();
  let auth: { sub: string; role: string } | null = null;
  try {
    auth = token ? verifyAccessToken(token) : null;
  } catch {
    auth = null;
  }
  if (!auth) notFound();

  let plant;
  try {
    plant = await plantsService.getPlant(id, auth.sub, auth.role);
  } catch {
    plant = null;
  }
  if (!plant) notFound();

  const [schedule, { logs, total }] = await Promise.all([
    careService.getSchedule(id, auth.sub).catch(() => null),
    careService
      .listCareLogs(id, auth.sub, { limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE })
      .catch(() => ({ logs: [], total: 0 })),
  ]);

  const waterDays  = daysUntil(schedule?.wateringNextDue);
  const fertilDays = daysUntil(schedule?.fertilizingNextDue);
  const repotDays  = daysUntil(schedule?.repottingNextDue);
  const mistDays   = schedule?.mistingNeeded ? daysUntil(schedule?.mistingNextDue) : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/plants/${id}`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-bold text-gray-900">
            {en ? 'Care & history' : 'Грижи и история'}
          </h1>
          <p className="mt-0.5 truncate text-sm text-gray-500">{plant.customName}</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Schedule + quick logger (reused from the plant page) */}
        <PlantCareSection
          plantId={id}
          schedule={schedule}
          waterDays={waterDays}
          fertilDays={fertilDays}
          repotDays={repotDays}
          mistDays={mistDays}
          hasSpecies={!!plant.speciesId}
          showFullLogLink={false}
          showRecentLogs={false}
        />

        {/* Full, paginated history with edit/delete */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-1.5 text-base">
                <ClipboardList className="h-4 w-4 text-emerald-600" />
                {en ? 'Care history' : 'История на грижите'}
              </CardTitle>
              <span className="text-xs text-gray-400">{total}</span>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <CareLogList plantId={id} logs={logs} locale={locale} />
            {total > PAGE_SIZE && (
              <div className="pt-4">
                <Pagination
                  page={page}
                  total={total}
                  limit={PAGE_SIZE}
                  getHref={(p) => `?page=${p}`}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
