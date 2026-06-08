'use client';
import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { ScanLine, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AIAnalysisCard } from './ai-analysis-card';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from '@/i18n/navigation';
import type { AIAnalysis } from '@scarlet/shared';

interface AIAnalysisButtonProps {
  plantId: string;
  latestAnalysis?: (AIAnalysis & { matchedSpeciesId?: string | null }) | null;
  scansRemaining?: number | null;
  onAnalysisComplete?: (analysis: AIAnalysis) => void;
}

export function AIAnalysisButton({ plantId, latestAnalysis, scansRemaining, onAnalysisComplete }: AIAnalysisButtonProps) {
  const t = useTranslations();
  const locale = useLocale();
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<(AIAnalysis & { matchedSpeciesId?: string | null }) | null>(null);

  async function handleScan() {
    setLoading(true);
    try {
      const res = await fetch(`/api/plants/${plantId}/ai-analysis`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? t('errors.serverError'));
      }
      const enriched = { ...json.data.analysis, matchedSpecies: json.data.matchedSpecies ?? null };
      setAnalysis(enriched);
      onAnalysisComplete?.(enriched);
      toast({ title: t('ai.analysisComplete'), variant: 'success' });
      // A medium/high-confidence match auto-links the species and builds a care
      // schedule server-side — refresh so the schedule/species cards update.
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('errors.serverError');
      toast({ title: t('common.error'), description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  async function handleApplySpecies() {
    if (!analysis?.identifiedScientificName) return;
    try {
      const res = await fetch(`/api/plants/${plantId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ speciesId: analysis.matchedSpeciesId, speciesConfirmed: true }),
      });
      if (!res.ok) throw new Error();
      toast({ title: t('ai.speciesApplied'), variant: 'success' });
      // Applying a species (re)builds the care schedule — refresh to show it.
      router.refresh();
    } catch {
      toast({ title: t('common.error'), variant: 'destructive' });
    }
  }

  return (
    <div className="space-y-3">
      {/* Context from the last scan — helps decide whether re-scanning is worth it */}
      {!analysis && latestAnalysis && (
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          <span>
            {t('ai.lastScanned')}{' '}
            {new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(latestAnalysis.analyzedAt))}
            {latestAnalysis.healthScore != null && ` · ${latestAnalysis.healthScore}/100`}
            {latestAnalysis.overallCondition && ` · ${t(`ai.condition.${latestAnalysis.overallCondition as 'excellent' | 'good' | 'fair' | 'poor' | 'critical'}`)}`}
          </span>
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <Button onClick={handleScan} isLoading={loading} className="gap-2">
          <ScanLine className="h-4 w-4" />
          {loading ? t('ai.analyzing') : t('ai.scanButton')}
        </Button>
        {scansRemaining != null && (
          <span className="text-xs text-gray-400">
            {scansRemaining} {t('ai.scansLeftToday')}
          </span>
        )}
      </div>

      {analysis && (
        <AIAnalysisCard
          analysis={analysis}
          showApplyButton={!!analysis.matchedSpeciesId}
          onApplySpecies={handleApplySpecies}
        />
      )}
    </div>
  );
}
