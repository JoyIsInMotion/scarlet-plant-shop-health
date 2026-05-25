'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ScanLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AIAnalysisCard } from './ai-analysis-card';
import { useToast } from '@/hooks/use-toast';
import type { AIAnalysis } from '@scarlet/shared';

interface AIAnalysisButtonProps {
  plantId: string;
  onAnalysisComplete?: (analysis: AIAnalysis) => void;
}

export function AIAnalysisButton({ plantId, onAnalysisComplete }: AIAnalysisButtonProps) {
  const t = useTranslations();
  const { toast } = useToast();
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
      setAnalysis(json.data.analysis);
      onAnalysisComplete?.(json.data.analysis);
      toast({ title: t('ai.analysisComplete'), variant: 'success' });
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
    } catch {
      toast({ title: t('common.error'), variant: 'destructive' });
    }
  }

  return (
    <div className="space-y-4">
      <Button onClick={handleScan} isLoading={loading} className="gap-2">
        <ScanLine className="h-4 w-4" />
        {loading ? t('ai.analyzing') : t('ai.scanButton')}
      </Button>

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
