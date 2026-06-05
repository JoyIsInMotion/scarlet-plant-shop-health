'use client';

import { useTranslations } from 'next-intl';
import { Droplets, CheckCircle2 } from 'lucide-react';
import { HealthScoreRing } from './health-score-ring';
import type { AIAnalysis } from '@scarlet/shared';

interface HealthSummaryPanelProps {
  healthScore: number;
  analysis?: Pick<AIAnalysis, 'overallCondition' | 'issues' | 'careRecommendations' | 'wateringNeeded'> | null;
}

function deriveCondition(score: number) {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'fair';
  if (score >= 20) return 'poor';
  return 'critical';
}

const severityColors = {
  high: { dot: 'bg-red-500', bg: 'bg-red-50', text: 'text-red-900', sub: 'text-red-700' },
  medium: { dot: 'bg-yellow-400', bg: 'bg-yellow-50', text: 'text-yellow-900', sub: 'text-yellow-700' },
  low: { dot: 'bg-green-500', bg: 'bg-green-50', text: 'text-green-900', sub: 'text-green-700' },
};

export function HealthSummaryPanel({ healthScore, analysis }: HealthSummaryPanelProps) {
  const t = useTranslations();

  const condition = analysis?.overallCondition ?? deriveCondition(healthScore);
  const issues = (analysis?.issues ?? []) as Array<{ name: string; severity: string; description: string }>;
  const recommendations = (analysis?.careRecommendations ?? []) as unknown as Array<{ en: string; bg: string } | string>;

  const statusBg =
    healthScore >= 80 ? 'bg-green-50 text-green-800' :
    healthScore >= 60 ? 'bg-lime-50 text-lime-800' :
    healthScore >= 40 ? 'bg-yellow-50 text-yellow-800' :
    healthScore >= 20 ? 'bg-orange-50 text-orange-800' :
    'bg-red-50 text-red-800';

  return (
    <div className="p-4 space-y-4">
      {/* Score row */}
      <div className="flex items-center gap-4">
        <HealthScoreRing score={healthScore} size={96} />
        <div className="min-w-0">
          <p className="text-xs text-gray-500 uppercase tracking-wide">{t('plants.healthScore')}</p>
          <p className={`mt-1 text-sm font-semibold px-3 py-1 rounded-full inline-block ${statusBg}`}>
            {t(`ai.statusMessage.${condition as 'excellent' | 'good' | 'fair' | 'poor' | 'critical'}`)}
          </p>
          {analysis?.wateringNeeded && (
            <p className="flex items-center gap-1.5 text-sm text-blue-600 mt-2">
              <Droplets className="h-4 w-4 flex-shrink-0" />
              {t('ai.wateringNeeded')}
            </p>
          )}
        </div>
      </div>

      {/* Issues */}
      {issues.length > 0 ? (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('ai.issues')}</p>
          <div className="space-y-2">
            {issues.map((issue, i) => {
              const colors = severityColors[issue.severity as keyof typeof severityColors] ?? severityColors.low;
              return (
                <div key={i} className={`flex items-start gap-3 p-3 rounded-lg ${colors.bg}`}>
                  <div className={`w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ${colors.dot}`} />
                  <div className="min-w-0">
                    <p className={`text-sm font-medium ${colors.text}`}>{issue.name}</p>
                    <p className={`text-xs mt-0.5 ${colors.sub}`}>{issue.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : analysis ? (
        <p className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          {t('ai.noIssues')}
        </p>
      ) : null}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {t('ai.careRecommendations')}
          </p>
          <ol className="space-y-2">
            {recommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-red-100 text-red-700 text-xs font-semibold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                {typeof rec === 'string' ? rec : rec.en}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
