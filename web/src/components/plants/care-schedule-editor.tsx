'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Droplets, Leaf, FlowerIcon, Wind, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { plantCareSchedules } from '@/db/schema';

interface CareScheduleEditorProps {
  plantId: string;
  schedule: typeof plantCareSchedules.$inferSelect | null;
  onClose: () => void;
}

export function CareScheduleEditor({ plantId, schedule, onClose }: CareScheduleEditorProps) {
  const t = useTranslations();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const [watering, setWatering] = useState(schedule?.wateringIntervalDays?.toString() ?? '7');
  const [fertilizing, setFertilizing] = useState(schedule?.fertilizingIntervalDays?.toString() ?? '14');
  const [repotting, setRepotting] = useState(schedule?.repottingIntervalMonths?.toString() ?? '18');
  const [misting, setMisting] = useState(schedule?.mistingNeeded ?? false);

  async function handleSave() {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/plants/${plantId}/schedule`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wateringIntervalDays: parseInt(watering) || undefined,
          fertilizingIntervalDays: parseInt(fertilizing) || undefined,
          repottingIntervalMonths: parseInt(repotting) || undefined,
          mistingNeeded: misting,
        }),
      });

      if (!res.ok) {
        try {
          const { error } = await res.json();
          throw new Error(error ?? t('errors.serverError'));
        } catch {
          throw new Error(t('errors.serverError'));
        }
      }

      toast({ title: t('common.success'), variant: 'success' });
      router.refresh();
      onClose();
    } catch (error: unknown) {
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('errors.serverError'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-gray-200 shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle>{t('plants.editSchedule')}</CardTitle>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label={t('common.close')}
          >
            <X className="h-4 w-4" />
          </button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="flex items-center gap-2 mb-2 text-sm font-medium text-gray-700">
              <Droplets className="h-4 w-4 text-blue-400" />
              {t('plants.wateringInterval')}
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={watering}
                onChange={(e) => setWatering(e.target.value)}
                min="1"
                className="flex-1"
              />
              <span className="text-sm text-gray-500">{t('plants.days')}</span>
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 mb-2 text-sm font-medium text-gray-700">
              <Leaf className="h-4 w-4 text-green-500" />
              {t('plants.fertilizingInterval')}
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={fertilizing}
                onChange={(e) => setFertilizing(e.target.value)}
                min="1"
                className="flex-1"
              />
              <span className="text-sm text-gray-500">{t('plants.days')}</span>
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 mb-2 text-sm font-medium text-gray-700">
              <FlowerIcon className="h-4 w-4 text-purple-400" />
              {t('plants.repottingInterval')}
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={repotting}
                onChange={(e) => setRepotting(e.target.value)}
                min="1"
                className="flex-1"
              />
              <span className="text-sm text-gray-500">{t('plants.months')}</span>
            </div>
          </div>

          <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={misting}
              onChange={(e) => setMisting(e.target.checked)}
              className="h-4 w-4"
            />
            <div className="flex items-center gap-2">
              <Wind className="h-4 w-4 text-cyan-400" />
              <span className="text-sm font-medium text-gray-700">{t('plants.mistingNeeded')}</span>
            </div>
          </label>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={isLoading}>
              {t('common.cancel')}
            </Button>
            <Button className="flex-1" onClick={handleSave} isLoading={isLoading}>
              {t('common.save')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
