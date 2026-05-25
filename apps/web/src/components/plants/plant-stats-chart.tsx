'use client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useTranslations } from 'next-intl';
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

  // Group by date + metric
  const byDate = new Map<string, Record<string, number>>();
  for (const stat of stats) {
    const date = new Date(stat.recordedAt).toLocaleDateString('bg-BG', { day: '2-digit', month: 'short' });
    const entry = byDate.get(date) ?? {};
    entry[stat.metricType] = stat.value;
    byDate.set(date, entry);
  }

  const data = Array.from(byDate.entries())
    .slice(-14)
    .map(([date, metrics]) => ({ date, ...metrics }));

  const metrics = [...new Set(stats.map((s) => s.metricType))];

  if (data.length === 0) return null;

  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {metrics.map((m) => (
            <Line
              key={m}
              type="monotone"
              dataKey={m}
              name={t(m as 'water' | 'light' | 'humidity' | 'temperature' | 'fertilizer')}
              stroke={METRIC_COLORS[m] ?? '#6b7280'}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
