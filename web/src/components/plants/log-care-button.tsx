'use client';

import { useState, useTransition } from 'react';
import { useRouter } from '@/i18n/navigation';
import { Droplets, Leaf, FlowerIcon, Wind, Scissors, RotateCcw, Eye, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

const CARE_TYPES = [
  { value: 'watered',    labelEn: 'Watered',    labelBg: 'Поливане',    icon: Droplets },
  { value: 'fertilized', labelEn: 'Fertilized', labelBg: 'Торене',      icon: Leaf },
  { value: 'repotted',   labelEn: 'Repotted',   labelBg: 'Преглаждане',  icon: FlowerIcon },
  { value: 'misted',     labelEn: 'Misted',     labelBg: 'Пръскане',    icon: Wind },
  { value: 'pruned',     labelEn: 'Pruned',     labelBg: 'Подрязване',  icon: Scissors },
  { value: 'rotated',    labelEn: 'Rotated',    labelBg: 'Завъртане',   icon: RotateCcw },
  { value: 'observation', labelEn: 'Observation', labelBg: 'Наблюдение', icon: Eye },
] as const;

interface Props {
  plantId: string;
  locale: string;
}

export function LogCareButton({ plantId, locale }: Props) {
  const [open, setOpen]       = useState(false);
  const [notes, setNotes]     = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function submit(careType: string) {
    setSelected(careType);
    const base = process.env.NEXT_PUBLIC_APP_URL ?? '';
    await fetch(`${base}/api/plants/${plantId}/care-logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ careType, notes: notes.trim() || undefined }),
    });
    setOpen(false);
    setNotes('');
    setSelected(null);
    startTransition(() => router.refresh());
  }

  return (
    <div className="relative">
      <Button
        size="sm"
        className="rounded-full gap-1.5"
        onClick={() => setOpen(v => !v)}
        disabled={isPending}
      >
        <Droplets className="h-3.5 w-3.5" />
        {locale === 'en' ? 'Log care' : 'Запис на грижа'}
        <ChevronDown className="h-3.5 w-3.5" />
      </Button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-56 rounded-xl border border-gray-200 bg-white shadow-lg">
          <div className="p-2 space-y-0.5">
            {CARE_TYPES.map(({ value, labelEn, labelBg, icon: Icon }) => (
              <button
                key={value}
                onClick={() => submit(value)}
                disabled={isPending && selected === value}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                <Icon className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                {locale === 'en' ? labelEn : labelBg}
              </button>
            ))}
          </div>
          <div className="border-t border-gray-100 p-2">
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder={locale === 'en' ? 'Notes (optional)' : 'Бележки (незадължително)'}
              rows={2}
              className="w-full resize-none rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-gray-700 focus:border-emerald-400 focus:outline-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}
