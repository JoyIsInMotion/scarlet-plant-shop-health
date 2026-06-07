'use client';
import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Droplets, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, ExternalLink, Leaf, Sparkles, Sun, Wind, Thermometer, Leaf as LeafFull, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { AIAnalysis } from '@scarlet/shared';

interface AIAnalysisCardProps {
  analysis: AIAnalysis & { matchedSpeciesId?: string | null };
  onApplySpecies?: () => void;
  showApplyButton?: boolean;
}

interface CareBasicItem {
  key: keyof NonNullable<AIAnalysis['careBasics']>;
  icon: React.ReactNode;
  labelEn: string;
  labelBg: string;
  tooltipEn: string;
  tooltipBg: string;
}

const CARE_ICONS: CareBasicItem[] = [
  {
    key: 'light',
    icon: <Sun className="h-4 w-4" />,
    labelEn: 'Light',
    labelBg: 'Светлина',
    tooltipEn: 'How much light the plant needs',
    tooltipBg: 'Количеството светлина, кое растението изисква'
  },
  {
    key: 'watering',
    icon: <Droplets className="h-4 w-4" />,
    labelEn: 'Water',
    labelBg: 'Вода',
    tooltipEn: 'How often to water',
    tooltipBg: 'Колко често да поливате'
  },
  {
    key: 'temperature',
    icon: <Thermometer className="h-4 w-4" />,
    labelEn: 'Temperature',
    labelBg: 'Температура',
    tooltipEn: 'Ideal temperature range',
    tooltipBg: 'Идеалнa температурa '
  },
  {
    key: 'humidity',
    icon: <Wind className="h-4 w-4" />,
    labelEn: 'Humidity',
    labelBg: 'Влажност',
    tooltipEn: 'Air moisture level preferred',
    tooltipBg: 'Желана влажност на въздуха'
  },
  {
    key: 'fertilizer',
    icon: <LeafFull className="h-4 w-4" />,
    labelEn: 'Fertilizer',
    labelBg: 'Тор',
    tooltipEn: 'Feeding schedule for growth',
    tooltipBg: 'График на тoрeне за растеж'
  },
  {
    key: 'soil',
    icon: <AlertCircle className="h-4 w-4" />,
    labelEn: 'Soil',
    labelBg: 'Почва',
    tooltipEn: 'Type of soil mix needed',
    tooltipBg: 'Вид почвена смес'
  },
  {
    key: 'toxicity',
    icon: <AlertTriangle className="h-4 w-4" />,
    labelEn: 'Pets',
    labelBg: 'Домашни любимци',
    tooltipEn: 'Safety for pets',
    tooltipBg: 'Безопасност за домашни животни'
  },
];

export function AIAnalysisCard({ analysis, onApplySpecies, showApplyButton }: AIAnalysisCardProps) {
  const t = useTranslations();
  const locale = useLocale();
  const [showDetails, setShowDetails] = useState(false);

  const advice = locale === 'bg' ? analysis.adviceBg : analysis.adviceEn;
  const plantName = analysis.identifiedCommonName;

  const conditionColor =
    analysis.overallCondition === 'excellent' || analysis.overallCondition === 'good'
      ? 'text-green-700 bg-green-50 border-green-200'
      : analysis.overallCondition === 'fair'
      ? 'text-yellow-700 bg-yellow-50 border-yellow-200'
      : 'text-red-700 bg-red-50 border-red-200';

  return (
    <div className="space-y-3">
      {/* Main friendly card */}
      <Card className="border-0 shadow-md overflow-hidden">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 px-5 pt-5 pb-4">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-white p-2 shadow-sm shrink-0">
              <Leaf className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              {plantName ? (
                <p className="font-semibold text-gray-900 text-base leading-tight">{plantName}</p>
              ) : (
                <p className="font-semibold text-gray-900 text-base">{t('ai.unknownPlant')}</p>
              )}
              {analysis.identifiedScientificName && (
                <p className="text-xs italic text-gray-400 mt-0.5">{analysis.identifiedScientificName}</p>
              )}
            </div>
            {analysis.overallCondition && (
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${conditionColor} shrink-0`}>
                {t(`ai.condition.${analysis.overallCondition as 'excellent' | 'good' | 'fair' | 'poor' | 'critical'}`)}
              </span>
            )}
          </div>

          {/* Friendly advice */}
          {advice && (
            <div className="mt-4 flex gap-2.5">
              <Sparkles className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
              <p className="text-sm text-gray-700 leading-relaxed">{advice}</p>
            </div>
          )}

          {/* Care basics - text labels */}
          {analysis.careBasics && (
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {CARE_ICONS.map((item) => {
                const careValue = analysis.careBasics?.[item.key];
                if (!careValue) return null;
                const value = locale === 'bg' ? careValue.bg : careValue.en;
                if (!value) return null;
                const label = locale === 'bg' ? item.labelBg : item.labelEn;
                const tooltip = locale === 'bg' ? item.tooltipBg : item.tooltipEn;
                return (
                  <div
                    key={item.key}
                    className="relative group flex items-center gap-2 text-xs bg-white/60 rounded-lg px-2.5 py-1.5 cursor-help"
                  >
                    <span className="text-gray-600 shrink-0">{item.icon}</span>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-700 truncate">{value}</p>
                    </div>
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap pointer-events-none z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="font-medium">{label}</p>
                      <p className="text-gray-300">{tooltip}</p>
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Watering banner */}
        {analysis.wateringNeeded && (
          <div className="flex items-center gap-2 bg-blue-50 border-t border-blue-100 px-5 py-2.5">
            <Droplets className="h-4 w-4 text-blue-500 shrink-0" />
            <p className="text-sm font-medium text-blue-700">{t('ai.wateringNeeded')}</p>
          </div>
        )}

        <CardContent className="pt-4 pb-4 space-y-4">
          {/* Issues */}
          {Array.isArray(analysis.issues) && analysis.issues.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{t('ai.issues')}</p>
              <ul className="space-y-2">
                {(analysis.issues as Array<{ name: string | { en: string; bg: string }; severity: string; description: string | { en: string; bg: string } }>).map((issue, i) => {
                  const issueName = typeof issue.name === 'object'
                    ? (locale === 'bg' ? issue.name.bg : issue.name.en)
                    : issue.name;
                  const issueDesc = typeof issue.description === 'object'
                    ? (locale === 'bg' ? issue.description.bg : issue.description.en)
                    : issue.description;
                  return (
                    <li key={i} className="flex items-start gap-2.5 text-sm">
                      <AlertTriangle className={`h-4 w-4 mt-0.5 shrink-0 ${
                        issue.severity === 'high' ? 'text-red-400' :
                        issue.severity === 'medium' ? 'text-amber-400' : 'text-yellow-300'
                      }`} />
                      <p className="text-gray-600 leading-snug">
                        <span className="font-medium text-gray-800">{issueName} — </span>
                        {issueDesc}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <p className="flex items-center gap-2 text-sm text-green-600 font-medium">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {t('ai.noIssues')}
            </p>
          )}

          {/* Care tips */}
          {Array.isArray(analysis.careRecommendations) && analysis.careRecommendations.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{t('ai.careRecommendations')}</p>
              <ul className="space-y-1.5">
                {(analysis.careRecommendations as Array<{ en: string; bg: string }>).map((rec, i) => {
                  const text = locale === 'bg' ? rec.bg : rec.en;
                  return (
                    <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                      <span className="text-emerald-400 font-bold mt-0.5 shrink-0">✓</span>
                      {text}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Links */}
          <div className="flex items-center gap-2 pt-1 flex-wrap">
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

      {/* Technical details toggle */}
      <button
        onClick={() => setShowDetails(v => !v)}
        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors w-full justify-center py-1"
      >
        {showDetails ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        {showDetails ? t('ai.hideDetails') : t('ai.showDetails')}
      </button>

      {showDetails && (
        <Card className="border border-gray-100">
          <CardContent className="pt-4 pb-4 space-y-3 text-sm text-gray-600">
            {analysis.healthScore != null && (
              <div className="flex justify-between">
                <span className="text-gray-400">{t('ai.healthScore')}</span>
                <span className="font-medium text-gray-800">{analysis.healthScore} / 100</span>
              </div>
            )}
            {analysis.identifiedFamily && (
              <div className="flex justify-between">
                <span className="text-gray-400">{t('catalog.family')}</span>
                <span className="font-medium text-gray-800">{analysis.identifiedFamily}</span>
              </div>
            )}
            {analysis.identifiedNativeRegion && (
              <div className="flex justify-between">
                <span className="text-gray-400">{t('catalog.nativeRegion')}</span>
                <span className="font-medium text-gray-800">{analysis.identifiedNativeRegion}</span>
              </div>
            )}
            {analysis.identifiedCareDifficulty && (
              <div className="flex justify-between items-center">
                <span className="text-gray-400">{t('catalog.careDifficulty')}</span>
                <Badge variant={
                  analysis.identifiedCareDifficulty === 'easy' ? 'success' :
                  analysis.identifiedCareDifficulty === 'moderate' ? 'warning' : 'danger'
                }>
                  {t(`catalog.${analysis.identifiedCareDifficulty as 'easy' | 'moderate' | 'difficult'}`)}
                </Badge>
              </div>
            )}
            {analysis.confidence && (
              <div className="flex justify-between items-center">
                <span className="text-gray-400">{t('ai.confidence.label')}</span>
                <Badge variant={analysis.confidence === 'high' ? 'success' : analysis.confidence === 'medium' ? 'warning' : 'default'}>
                  {t(`ai.confidence.${analysis.confidence as 'low' | 'medium' | 'high'}`)}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
