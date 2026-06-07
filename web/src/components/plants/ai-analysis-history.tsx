'use client';
import { useState } from 'react';
import { useLocale } from 'next-intl';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { AIAnalysisCard } from './ai-analysis-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { AIAnalysis } from '@scarlet/shared';

interface AIAnalysisHistoryProps {
  analyses: AIAnalysis[];
}

export function AIAnalysisHistory({ analyses }: AIAnalysisHistoryProps) {
  const locale = useLocale();
  const [expanded, setExpanded] = useState<string | null>(analyses[0]?.id ?? null);

  if (analyses.length === 0) return null;

  return (
    <div className="space-y-3">
      {analyses.map((a) => (
        <Card key={a.id} className="overflow-hidden">
          <button
            className="w-full text-left"
            onClick={() => setExpanded(expanded === a.id ? null : a.id)}
          >
            <CardHeader className="py-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm font-medium">
                    {new Intl.DateTimeFormat(locale, {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    }).format(new Date(a.analyzedAt))}
                  </CardTitle>
                  {a.healthScore != null && (
                    <Badge variant={a.healthScore >= 60 ? 'success' : a.healthScore >= 40 ? 'warning' : 'danger'}>
                      {Math.round(a.healthScore)}%
                    </Badge>
                  )}
                </div>
                {expanded === a.id ? (
                  <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
                )}
              </div>
            </CardHeader>
          </button>

          {expanded === a.id && (
            <CardContent className="pt-0 pb-4">
              <AIAnalysisCard analysis={a} showApplyButton={false} />
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}
