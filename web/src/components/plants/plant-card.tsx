'use client';
import { Droplets, Leaf } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { HealthScoreRing } from './health-score-ring';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from '@/i18n/navigation';
import type { Plant } from '@scarlet/shared';

interface PlantCardProps {
  plant: Plant & { speciesName?: string | null };
}

export function PlantCard({ plant }: PlantCardProps) {
  const t = useTranslations('plants');
  const locale = useLocale();
  const speciesName = plant.speciesName ?? (plant.species
    ? (locale === 'en'
      ? plant.species.commonNameEn ?? plant.species.commonNameBg ?? plant.species.scientificName
      : plant.species.commonNameBg ?? plant.species.commonNameEn ?? plant.species.scientificName)
    : null);

  return (
    <Link href={`/plants/${plant.id}`}>
      <Card className="group h-full overflow-hidden border-gray-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
        <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
          {plant.imageUrl ? (
            <img
              src={plant.imageUrl}
              alt={plant.customName}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
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
              {speciesName && (
                <p className="text-xs text-gray-500 truncate italic mt-0.5">{speciesName}</p>
              )}
            </div>
            <HealthScoreRing score={plant.healthScore} size={52} />
          </div>

          <div className="mt-3 flex items-center gap-3 text-xs text-gray-500">
            {plant.lastWatered && (
              <span className="flex items-center gap-1">
                <Droplets className="h-3.5 w-3.5 text-blue-400" />
                {new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short' }).format(new Date(plant.lastWatered))}
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
