'use client';
import { useTranslations } from 'next-intl';
import { Droplets, AlertTriangle, CheckCircle2, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { HealthScoreRing } from './health-score-ring';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AIAnalysis } from '@scarlet/shared';

interface AIAnalysisCardProps {
  analysis: AIAnalysis & { matchedSpeciesId?: string | null };
  onApplySpecies?: () => void;
  showApplyButton?: boolean;
}

const severityVariant: Record<string, 'success' | 'warning' | 'danger'> = {
  low: 'success',
  medium: 'warning',
  high: 'danger',
};

export function AIAnalysisCard({ analysis, onApplySpecies, showApplyButton }: AIAnalysisCardProps) {
  const t = useTranslations();

  return (
    <div className="space-y-4">
      {/* Species panel */}
      {analysis.identifiedCommonName && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('ai.species')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-gray-900">{analysis.identifiedCommonName}</p>
                {analysis.identifiedScientificName && (
                  <p className="text-sm italic text-gray-500">{analysis.identifiedScientificName}</p>
                )}
              </div>
              <Badge variant={analysis.confidence === 'high' ? 'success' : analysis.confidence === 'medium' ? 'warning' : 'default'}>
                {t(`ai.confidence.${analysis.confidence as 'low' | 'medium' | 'high'}`)}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              {analysis.identifiedFamily && (
                <div>
                  <span className="text-xs text-gray-500">{t('catalog.family')}</span>
                  <p className="font-medium">{analysis.identifiedFamily}</p>
                </div>
              )}
              {analysis.identifiedNativeRegion && (
                <div>
                  <span className="text-xs text-gray-500">{t('catalog.nativeRegion')}</span>
                  <p className="font-medium">{analysis.identifiedNativeRegion}</p>
                </div>
              )}
              {analysis.identifiedCareDifficulty && (
                <div>
                  <span className="text-xs text-gray-500">{t('catalog.careDifficulty')}</span>
                  <Badge variant={
                    analysis.identifiedCareDifficulty === 'easy' ? 'success' :
                    analysis.identifiedCareDifficulty === 'moderate' ? 'warning' : 'danger'
                  }>
                    {t(`catalog.${analysis.identifiedCareDifficulty as 'easy' | 'moderate' | 'difficult'}`)}
                  </Badge>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-1">
              {showApplyButton && onApplySpecies && (
                <Button size="sm" variant="outline" onClick={onApplySpecies}>
                  {t('ai.applySpecies')}
                </Button>
              )}
              {analysis.matchedSpeciesId && (
                <Button size="sm" variant="ghost" asChild>
                  <Link href={`/catalog/${analysis.matchedSpeciesId}`} className="flex items-center gap-1">
                    {t('catalog.viewInCatalog')}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Health panel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('ai.health')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            {analysis.healthScore != null && (
              <HealthScoreRing score={analysis.healthScore} size={72} />
            )}
            <div>
              <Badge variant={
                analysis.overallCondition === 'excellent' ? 'success' :
                analysis.overallCondition === 'good' ? 'success' :
                analysis.overallCondition === 'fair' ? 'warning' : 'danger'
              }>
                {analysis.overallCondition ? t(`ai.condition.${analysis.overallCondition as 'excellent' | 'good' | 'fair' | 'poor' | 'critical'}`) : '—'}
              </Badge>
              {analysis.wateringNeeded && (
                <p className="flex items-center gap-1 text-sm text-blue-600 mt-2">
                  <Droplets className="h-4 w-4" />
                  {t('ai.wateringNeeded')}
                </p>
              )}
            </div>
          </div>

          {/* Issues */}
          {Array.isArray(analysis.issues) && analysis.issues.length > 0 ? (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">{t('ai.issues')}</p>
              <ul className="space-y-2">
                {(analysis.issues as Array<{ name: string; severity: string; description: string }>).map((issue, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <AlertTriangle className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                      issue.severity === 'high' ? 'text-red-500' :
                      issue.severity === 'medium' ? 'text-yellow-500' : 'text-green-500'
                    }`} />
                    <div>
                      <span className="font-medium">{issue.name}</span>
                      <Badge variant={severityVariant[issue.severity] ?? 'default'} className="ml-1.5 text-[10px]">
                        {t(`ai.severity.${issue.severity as 'low' | 'medium' | 'high'}`)}
                      </Badge>
                      <p className="text-gray-500 mt-0.5">{issue.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="flex items-center gap-1.5 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              {t('ai.noIssues')}
            </p>
          )}

          {/* Care recommendations */}
          {Array.isArray(analysis.careRecommendations) && analysis.careRecommendations.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">{t('ai.careRecommendations')}</p>
              <ul className="space-y-1">
                {(analysis.careRecommendations as string[]).map((rec, i) => (
                  <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                    <span className="text-red-400 mt-0.5">•</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
