'use client';

import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { useLocale } from 'next-intl';
import type { AIAnalysis } from '@scarlet/shared';

interface AnalysisTrendChartProps {
  analyses: Pick<AIAnalysis, 'analyzedAt' | 'healthScore'>[];
}

function dotColor(score: number): string {
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#84cc16';
  if (score >= 40) return '#eab308';
  if (score >= 20) return '#f97316';
  return '#ef4444';
}

export function AnalysisTrendChart({ analyses }: AnalysisTrendChartProps) {
  const [mounted, setMounted] = useState(false);
  const locale = useLocale();
  useEffect(() => setMounted(true), []);

  const chartData = analyses
    .filter((a) => a.healthScore != null)
    .slice()
    .sort((a, b) => new Date(a.analyzedAt).getTime() - new Date(b.analyzedAt).getTime())
    .map((a) => ({
      label: new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short' }).format(
        new Date(a.analyzedAt),
      ),
      score: Math.round(a.healthScore!),
      color: dotColor(a.healthScore!),
    }));

  if (chartData.length === 0) return null;

  return (
    <div className="h-56">
      {mounted ? (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 16, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={32}
            />
            <ReferenceLine y={80} stroke="#22c55e" strokeDasharray="4 4" strokeOpacity={0.4} />
            <ReferenceLine y={40} stroke="#f97316" strokeDasharray="4 4" strokeOpacity={0.4} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid #e5e7eb' }}
              labelStyle={{ fontWeight: 600 }}
              formatter={(value) => [String(value), 'Score'] as [string, string]}
            />
            <Line
              type="monotone"
              dataKey="score"
              stroke="#6b7280"
              strokeWidth={2.5}
              dot={(props) => {
                const { cx, cy, payload } = props as { cx: number; cy: number; payload: { color: string } };
                return (
                  <circle
                    key={`dot-${cx}-${cy}`}
                    cx={cx}
                    cy={cy}
                    r={5}
                    fill={payload.color}
                    stroke="#fff"
                    strokeWidth={2}
                  />
                );
              }}
              activeDot={{ r: 7 }}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-full rounded-lg bg-gray-50 animate-pulse" />
      )}
    </div>
  );
}
