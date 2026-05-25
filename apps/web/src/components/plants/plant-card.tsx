'use client';
import Link from 'next/link';
import { Droplets, Calendar, Leaf } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { HealthScoreRing } from './health-score-ring';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { Plant } from '@scarlet/shared';

interface PlantCardProps {
  plant: Plant & { speciesName?: string | null };
}

export function PlantCard({ plant }: PlantCardProps) {
  const t = useTranslations('plants');

  return (
    <Link href={`/plants/${plant.id}`}>
      <Card className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer h-full">
        <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
          {plant.imageUrl ? (
            <img
              src={plant.imageUrl}
              alt={plant.customName}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Leaf className="h-12 w-12 text-gray-300" />
            </div>
          )}
          {plant.isArchived && (
            <div className="absolute inset-0 bg-gray-900/60 flex items-center justify-center">
              <Badge variant="default">{t('archived')}</Badge>
            </div>
          )}
        </div>
        <CardContent className="pt-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900 truncate">{plant.customName}</h3>
              {plant.speciesName && (
                <p className="text-xs text-gray-500 truncate italic mt-0.5">{plant.speciesName}</p>
              )}
            </div>
            <HealthScoreRing score={plant.healthScore} size={52} />
          </div>

          <div className="mt-3 flex items-center gap-3 text-xs text-gray-500">
            {plant.lastWatered && (
              <span className="flex items-center gap-1">
                <Droplets className="h-3.5 w-3.5 text-blue-400" />
                {new Date(plant.lastWatered).toLocaleDateString()}
              </span>
            )}
            {plant.speciesId && (
              <span className="flex items-center gap-1 text-green-600">
                <Leaf className="h-3.5 w-3.5" />
                {t('linked')}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
