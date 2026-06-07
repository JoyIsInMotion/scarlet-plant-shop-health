'use client';

import { useState } from 'react';
import {
  CalendarDays, AlertCircle, ScanLine, Pencil, ClipboardList,
  ArrowRight, Plus, Sparkles,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/hooks/use-toast';
import { QuickCareLogger } from './quick-care-logger';
import { CareScheduleEditor } from './care-schedule-editor';
import type { plantCareSchedules } from '@/db/schema';

const CARE_TYPE_ICONS: Record<string, string> = {
  watered: '💧', fertilized: '🌱', repotted: '🪴',
  misted: '💦', pruned: '✂️', rotated: '🔄', observation: '👁️',
};

interface CareLog {
  id: string;
  careType: string;
  notes?: string | null;
  loggedAt: string | Date;
}

interface PlantCareSectionProps {
  plantId: string;
  schedule: typeof plantCareSchedules.$inferSelect | null;
  waterDays: number | null;
  fertilDays: number | null;
  repotDays: number | null;
  mistDays: number | null;
  /** Whether a species is linked — enables building a schedule from it. */
  hasSpecies?: boolean;
  recentLogs?: CareLog[];
  careTotal?: number;
  /** Link to the full care-log page. Hidden when already on that page. */
  showFullLogLink?: boolean;
  /** Show the recent-entries preview. Hidden on the full care-log page. */
  showRecentLogs?: boolean;
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
  hasSpecies = false,
  recentLogs = [],
  careTotal = 0,
  showFullLogLink = true,
  showRecentLogs = true,
}: PlantCareSectionProps) {
  const t = useTranslations();
  const locale = useLocale();
  const en = locale === 'en';
  const router = useRouter();
  const { toast } = useToast();
  const [showScheduleEditor, setShowScheduleEditor] = useState(false);
  const [showCareLogger, setShowCareLogger] = useState(false);
  const [building, setBuilding] = useState(false);
  const [confirmSwitch, setConfirmSwitch] = useState(false);

  async function applyAISchedule(force = false) {
    setBuilding(true);
    try {
      const res = await fetch(`/api/plants/${plantId}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force }),
      });
      if (!res.ok) throw new Error();
      toast({ title: en ? 'AI schedule applied' : 'AI графикът е приложен', variant: 'success' });
      router.refresh();
    } catch {
      toast({ title: en ? 'Error' : 'Грешка', variant: 'destructive' });
    } finally {
      setBuilding(false);
    }
  }

  // Switch a customized schedule back to the AI/species one (confirm first,
  // since it overwrites the user's values).
  function switchToAI() {
    if (!hasSpecies || !schedule?.isCustomized) return;
    setConfirmSwitch(true);
  }

  return (
    <>
      {/* ── Care Schedule ── */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4 text-emerald-600" />
              {en ? 'Care Schedule' : 'График за грижи'}
            </CardTitle>
            {schedule && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowScheduleEditor(true)}
                className="rounded-full text-xs"
              >
                {t('common.edit')}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0 pb-4 space-y-2.5">
          {schedule ? (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-gray-700">
                  💧 {en ? 'Water' : 'Поливане'}
                  <span className="text-xs text-gray-400">
                    ({en ? `every ${schedule.wateringIntervalDays}d` : `на ${schedule.wateringIntervalDays} дни`})
                  </span>
                </span>
                <DueBadge days={waterDays} locale={locale} />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-gray-700">
                  🌱 {en ? 'Fertilize' : 'Торене'}
                  <span className="text-xs text-gray-400">
                    ({en ? `every ${schedule.fertilizingIntervalDays}d` : `на ${schedule.fertilizingIntervalDays} дни`})
                  </span>
                </span>
                <DueBadge days={fertilDays} locale={locale} />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-gray-700">
                  🪴 {en ? 'Repot' : 'Преглаждане'}
                  <span className="text-xs text-gray-400">
                    ({en ? `every ${schedule.repottingIntervalMonths}mo` : `на ${schedule.repottingIntervalMonths} мес`})
                  </span>
                </span>
                <DueBadge days={repotDays} locale={locale} />
              </div>
              {schedule.mistingNeeded && (
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-gray-700">
                    💦 {en ? 'Mist' : 'Пръскане'}
                  </span>
                  <DueBadge days={mistDays} locale={locale} />
                </div>
              )}
              <div className="flex items-center gap-1.5 pt-1.5">
                <span className="text-xs text-gray-400">{en ? 'Schedule:' : 'График:'}</span>
                <div className="inline-flex rounded-full border border-gray-200 p-0.5 text-xs">
                  <button
                    onClick={switchToAI}
                    disabled={building || !hasSpecies}
                    title={!hasSpecies ? (en ? 'Link a species first' : 'Първо свържи вид') : undefined}
                    className={`rounded-full px-2.5 py-0.5 font-medium transition-colors ${
                      !schedule.isCustomized
                        ? 'bg-emerald-600 text-white'
                        : 'text-gray-500 hover:text-gray-700 disabled:opacity-40'
                    }`}
                  >
                    ✨ AI
                  </button>
                  <button
                    onClick={() => setShowScheduleEditor(true)}
                    className={`rounded-full px-2.5 py-0.5 font-medium transition-colors ${
                      schedule.isCustomized
                        ? 'bg-emerald-600 text-white'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    ✏️ {en ? 'Custom' : 'Ръчен'}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">
                {hasSpecies
                  ? (en
                    ? 'Build a schedule from the linked species, or set it up yourself.'
                    : 'Създай график от свързания вид или го настрой ръчно.')
                  : (en
                    ? 'No schedule yet. Identify the species to build one automatically.'
                    : 'Няма график. Разпознай вида, за да се създаде автоматично.')}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {hasSpecies ? (
                  <Button size="sm" className="rounded-full gap-1.5" onClick={() => applyAISchedule()} isLoading={building}>
                    <Sparkles className="h-3.5 w-3.5" />
                    {en ? 'Build schedule' : 'Създай график'}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="rounded-full gap-1.5"
                    onClick={() => document.getElementById('ai-scan-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                  >
                    <ScanLine className="h-3.5 w-3.5" />
                    {t('plants.scanToIdentify')}
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="rounded-full gap-1.5 text-gray-500" onClick={() => setShowScheduleEditor(true)}>
                  <Pencil className="h-3.5 w-3.5" />
                  {en ? 'Set up manually' : 'Настрой ръчно'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Care log (logger + recent entries + link to full history) ── */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-1.5">
              <ClipboardList className="h-4 w-4 text-emerald-600" />
              {en ? 'Care log' : 'Дневник за грижи'}
            </CardTitle>
            <Button
              variant={showCareLogger ? 'ghost' : 'outline'}
              size="sm"
              className="rounded-full gap-1 text-xs"
              onClick={() => setShowCareLogger((v) => !v)}
            >
              <Plus className={`h-3.5 w-3.5 transition-transform ${showCareLogger ? 'rotate-45' : ''}`} />
              {en ? 'Log care' : 'Запиши грижа'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0 pb-4 space-y-3">
          {showCareLogger && <QuickCareLogger plantId={plantId} locale={locale} />}

          {showRecentLogs && (
            recentLogs.length > 0 ? (
              <ul className="space-y-1">
                {recentLogs.map((log) => (
                  <li key={log.id} className="flex items-center gap-2 border-b border-gray-50 py-1.5 text-sm last:border-0">
                    <span className="text-base leading-none">{CARE_TYPE_ICONS[log.careType] ?? '🌿'}</span>
                    <div className="min-w-0 flex-1">
                      <span className="font-medium capitalize text-gray-700">{log.careType}</span>
                      {log.notes && <p className="truncate text-xs text-gray-400">{log.notes}</p>}
                    </div>
                    <span className="shrink-0 text-xs text-gray-400">
                      {new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short' }).format(new Date(log.loggedAt))}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              !showCareLogger && (
                <p className="py-2 text-sm text-gray-500">
                  {en ? 'No care logged yet.' : 'Все още няма записани грижи.'}
                </p>
              )
            )
          )}

          {showFullLogLink && (
            <Button variant="outline" asChild className="w-full justify-between rounded-xl">
              <Link href={`/plants/${plantId}/care-logs`}>
                <span className="flex items-center gap-1.5">
                  {en ? 'View full history & edit' : 'Цялата история и редакция'}
                  {careTotal > 0 && <span className="text-xs text-gray-400">({careTotal})</span>}
                </span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Schedule editor modal */}
      {showScheduleEditor && (
        <CareScheduleEditor
          plantId={plantId}
          schedule={schedule}
          onClose={() => setShowScheduleEditor(false)}
        />
      )}

      {/* Confirm switching a custom schedule back to the AI one */}
      <ConfirmDialog
        open={confirmSwitch}
        onOpenChange={setConfirmSwitch}
        title={en ? 'Switch to AI schedule?' : 'Към AI график?'}
        description={en
          ? 'This replaces your custom schedule with the AI schedule from the linked species.'
          : 'Това ще замени ръчния ти график с AI графика от свързания вид.'}
        confirmLabel={en ? 'Switch to AI' : 'Към AI'}
        cancelLabel={t('common.cancel')}
        isLoading={building}
        onConfirm={async () => { await applyAISchedule(true); setConfirmSwitch(false); }}
      />
    </>
  );
}
