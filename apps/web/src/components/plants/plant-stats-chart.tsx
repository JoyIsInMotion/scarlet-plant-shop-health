'use client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useLocale, useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import type { PlantStat } from '@scarlet/shared';

interface PlantStatsChartProps {
  stats: PlantStat[];
}

const METRIC_COLORS: Record<string, string> = {
  water: '#3b82f6',
  light: '#f59e0b',
  humidity: '#06b6d4',
  temperature: '#ef4444',
  fertilizer: '#22c55e',
};

export function PlantStatsChart({ stats }: PlantStatsChartProps) {
  const t = useTranslations('stats');
  const locale = useLocale();

  const orderedMetrics = ['water', 'light', 'humidity', 'temperature', 'fertilizer'] as const;
  const metrics = orderedMetrics.filter((metric) => stats.some((stat) => stat.metricType === metric));

  if (metrics.length === 0) return null;

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {metrics.map((metric) => {
        const series = stats
          .filter((stat) => stat.metricType === metric)
          .slice()
          .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());
        const latest = series[series.length - 1];
        const average = series.reduce((sum, stat) => sum + stat.value, 0) / series.length;
        const chartData = series.map((stat) => ({
          label: new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short' }).format(new Date(stat.recordedAt)),
          value: stat.value,
        }));
        const latestUnit = latest?.unit ? ` ${latest.unit}` : '';

        return (
          <Card key={metric} className="overflow-hidden border-gray-200 shadow-sm">
            <CardContent className="space-y-4 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{t(metric)}</p>
                  <p className="text-xs text-gray-500">{series.length} {locale === 'en' ? 'records' : 'записа'}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-semibold text-gray-900">{latest ? `${latest.value}${latestUnit}` : '—'}</p>
                  <p className="text-xs text-gray-500">{locale === 'en' ? 'Avg' : 'Средно'} {average.toFixed(1)}{latestUnit}</p>
                </div>
              </div>

              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={32} />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid #e5e7eb' }}
                      labelStyle={{ fontWeight: 600 }}
                      formatter={(value) => [String(value ?? ''), t(metric)] as [string, string]}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      name={t(metric)}
                      stroke={METRIC_COLORS[metric] ?? '#6b7280'}
                      strokeWidth={3}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {latest?.notes && <p className="text-xs leading-5 text-gray-500">{latest.notes}</p>}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
