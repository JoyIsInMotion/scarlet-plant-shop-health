'use client';

import { useState, useTransition } from 'react';
import { useRouter } from '@/i18n/navigation';
import { Droplets, Leaf, FlowerIcon, Wind, Scissors, RotateCcw, Eye, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const CARE_TYPES = [
  { value: 'watered',    labelEn: 'Water',    labelBg: 'Поливане',    icon: Droplets },
  { value: 'fertilized', labelEn: 'Fertilize', labelBg: 'Торене',      icon: Leaf },
  { value: 'repotted',   labelEn: 'Repot',    labelBg: 'Преглаждане',  icon: FlowerIcon },
  { value: 'misted',     labelEn: 'Mist',     labelBg: 'Пръскане',    icon: Wind },
  { value: 'pruned',     labelEn: 'Pruned',   labelBg: 'Подрязване',  icon: Scissors },
  { value: 'rotated',    labelEn: 'Rotated',  labelBg: 'Завъртане',   icon: RotateCcw },
  { value: 'observation', labelEn: 'Observe', labelBg: 'Наблюдение', icon: Eye },
] as const;

interface QuickCareLoggerProps {
  plantId: string;
  locale: string;
}

export function QuickCareLogger({ plantId, locale }: QuickCareLoggerProps) {
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState('');
  const [isPending, startTransition] = useTransition();
  const [completedTypes, setCompletedTypes] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const router = useRouter();

  function toggleType(careType: string) {
    const newSet = new Set(selectedTypes);
    if (newSet.has(careType)) {
      newSet.delete(careType);
    } else {
      newSet.add(careType);
    }
    setSelectedTypes(newSet);
  }

  async function handleSubmit() {
    if (selectedTypes.size === 0) {
      toast({
        title: locale === 'en' ? 'Select care types' : 'Изберете типове грижи',
        variant: 'destructive',
      });
      return;
    }

    startTransition(async () => {
      try {
        const base = process.env.NEXT_PUBLIC_APP_URL ?? '';

        // Submit all selected care types
        await Promise.all(
          Array.from(selectedTypes).map((careType) =>
            fetch(`${base}/api/plants/${plantId}/care-logs`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                careType,
                notes: notes.trim() || undefined,
              }),
            })
          )
        );

        setCompletedTypes(selectedTypes);
        setSelectedTypes(new Set());
        setNotes('');

        toast({
          title: locale === 'en' ? 'Care logged' : 'Грижа записана',
          variant: 'success',
        });

        setTimeout(() => {
          setCompletedTypes(new Set());
          router.refresh();
        }, 1500);
      } catch {
        toast({
          title: locale === 'en' ? 'Error' : 'Грешка',
          description: locale === 'en' ? 'Failed to log care' : 'Неуспешно записване',
          variant: 'destructive',
        });
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {CARE_TYPES.map(({ value, labelEn, labelBg, icon: Icon }) => {
          const isSelected = selectedTypes.has(value);
          const isCompleted = completedTypes.has(value);

          return (
            <button
              key={value}
              onClick={() => toggleType(value)}
              disabled={isPending || completedTypes.size > 0}
              className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                isCompleted
                  ? 'bg-emerald-100 text-emerald-700'
                  : isSelected
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isCompleted ? (
                <Check className="h-4 w-4" />
              ) : (
                <Icon className="h-4 w-4" />
              )}
              <span>{locale === 'en' ? labelEn : labelBg}</span>
            </button>
          );
        })}
      </div>

      {selectedTypes.size > 0 && (
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={locale === 'en' ? 'Notes (optional)' : 'Бележки (незадължително)'}
          rows={2}
          className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-emerald-400 focus:outline-none"
        />
      )}

      {selectedTypes.size > 0 && (
        <Button
          onClick={handleSubmit}
          disabled={isPending}
          className="w-full rounded-full bg-emerald-600 hover:bg-emerald-700"
          isLoading={isPending}
        >
          {locale === 'en' ? 'Done today' : 'Готово днес'}
        </Button>
      )}
    </div>
  );
}
