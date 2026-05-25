import { cn } from '@/lib/utils/cn';

interface HealthScoreRingProps {
  score: number;
  size?: number;
  className?: string;
}

function getColor(score: number): string {
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#84cc16';
  if (score >= 40) return '#eab308';
  if (score >= 20) return '#f97316';
  return '#ef4444';
}

function getLabel(score: number): string {
  if (score >= 80) return 'Отлично';
  if (score >= 60) return 'Добро';
  if (score >= 40) return 'Задоволително';
  if (score >= 20) return 'Лошо';
  return 'Критично';
}

export function HealthScoreRing({ score, size = 80, className }: HealthScoreRingProps) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color = getColor(score);

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e5e7eb"
          strokeWidth={6}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={6}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-lg font-bold" style={{ color }}>
          {Math.round(score)}
        </span>
        <span className="text-xs text-gray-500 leading-none">{getLabel(score)}</span>
      </div>
    </div>
  );
}
