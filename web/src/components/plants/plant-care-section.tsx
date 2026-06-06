'use client';

import { useState } from 'react';
import { CalendarDays, AlertCircle, ChevronDown, ScanLine, Pencil } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { QuickCareLogger } from './quick-care-logger';
import { CareScheduleEditor } from './care-schedule-editor';
import type { plantCareSchedules } from '@/db/schema';

interface PlantCareSectionProps {
  plantId: string;
  schedule: typeof plantCareSchedules.$inferSelect | null;
  waterDays: number | null;
  fertilDays: number | null;
  repotDays: number | null;
  mistDays: number | null;
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

export function PlantCareSection({
  plantId,
  schedule,
  waterDays,
  fertilDays,
  repotDays,
  mistDays,
}: PlantCareSectionProps) {
  const t = useTranslations();
  const locale = useLocale();
  const [showScheduleEditor, setShowScheduleEditor] = useState(false);
  const [showCareLogger, setShowCareLogger] = useState(false);

  return (
    <>
      {/* ── Care Schedule ── */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4 text-emerald-600" />
              {locale === 'en' ? 'Care Schedule' : 'График за грижи'}
            </CardTitle>
            {schedule && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowScheduleEditor(true)}
                className="rounded-full text-xs"
              >
                {locale === 'en' ? 'Edit' : 'Редактирай'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0 pb-4 space-y-2.5">
          {schedule ? (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-gray-700">
                  💧 {locale === 'en' ? 'Water' : 'Поливане'}
                  <span className="text-xs text-gray-400">
                    ({locale === 'en' ? `every ${schedule.wateringIntervalDays}d` : `на ${schedule.wateringIntervalDays} дни`})
                  </span>
                </span>
                <DueBadge days={waterDays} locale={locale} />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-gray-700">
                  🌱 {locale === 'en' ? 'Fertilize' : 'Торене'}
                  <span className="text-xs text-gray-400">
                    ({locale === 'en' ? `every ${schedule.fertilizingIntervalDays}d` : `на ${schedule.fertilizingIntervalDays} дни`})
                  </span>
                </span>
                <DueBadge days={fertilDays} locale={locale} />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-gray-700">
                  🪴 {locale === 'en' ? 'Repot' : 'Преглаждане'}
                  <span className="text-xs text-gray-400">
                    ({locale === 'en' ? `every ${schedule.repottingIntervalMonths}mo` : `на ${schedule.repottingIntervalMonths} мес`})
                  </span>
                </span>
                <DueBadge days={repotDays} locale={locale} />
              </div>
              {schedule.mistingNeeded && (
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-gray-700">
                    💦 {locale === 'en' ? 'Mist' : 'Пръскане'}
                  </span>
                  <DueBadge days={mistDays} locale={locale} />
                </div>
              )}
              {schedule.isCustomized && (
                <p className="text-xs text-gray-400 pt-1">{locale === 'en' ? '✏️ Custom schedule' : '✏️ Персонализиран график'}</p>
              )}
            </>
          ) : (
            <div className="space-y-2.5">
              <p className="text-sm text-gray-500">
                {locale === 'en'
                  ? 'No schedule yet. Link a species or log care to get started.'
                  : 'Няма график. Свържете вид или запишете грижа.'}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  className="rounded-full gap-1.5"
                  onClick={() => document.getElementById('ai-scan-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                >
                  <ScanLine className="h-3.5 w-3.5" />
                  {t('plants.scanToIdentify')}
                </Button>
                <Button variant="ghost" size="sm" asChild className="rounded-full gap-1.5 text-gray-500">
                  <Link href={`/plants/${plantId}/edit`}>
                    <Pencil className="h-3.5 w-3.5" />
                    {t('plants.addManually')}
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Quick Care Logger (Collapsible) ── */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="pb-3">
          <button
            onClick={() => setShowCareLogger(!showCareLogger)}
            className="flex items-center justify-between w-full hover:opacity-75 transition-opacity"
          >
            <CardTitle className="text-base">{locale === 'en' ? 'Log Care' : 'Запишете Грижа'}</CardTitle>
            <ChevronDown
              className="h-5 w-5 text-gray-500 transition-transform"
              style={{ transform: showCareLogger ? 'rotate(180deg)' : 'rotate(0)' }}
            />
          </button>
        </CardHeader>
        {showCareLogger && (
          <CardContent>
            <QuickCareLogger plantId={plantId} locale={locale} />
          </CardContent>
        )}
      </Card>

      {/* Schedule editor modal */}
      {showScheduleEditor && (
        <CareScheduleEditor
          plantId={plantId}
          schedule={schedule}
          onClose={() => setShowScheduleEditor(false)}
        />
      )}
    </>
  );
}
