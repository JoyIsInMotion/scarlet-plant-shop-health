'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from '@/i18n/navigation';

const CARE_TYPE_ICONS: Record<string, string> = {
  watered: '💧', fertilized: '🌱', repotted: '🪴',
  misted: '💦', pruned: '✂️', rotated: '🔄', observation: '👁️',
};

interface CareLog {
  id: string;
  careType: string;
  notes?: string | null;
  loggedAt: string | Date;
}

interface CareHistoryCollapsibleProps {
  careLogs: CareLog[];
  careTotal: number;
  locale: string;
  plantId: string;
}

export function CareHistoryCollapsible({
  careLogs,
  careTotal,
  locale,
  plantId,
}: CareHistoryCollapsibleProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (careLogs.length === 0) return null;

  return (
    <Card className="border-gray-200 shadow-sm">
      <CardHeader className="pb-2">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-between w-full hover:opacity-75 transition-opacity"
        >
          <CardTitle className="text-base">
            {locale === 'en' ? 'Care History' : 'История на грижите'}
          </CardTitle>
          <ChevronDown
            className="h-5 w-5 text-gray-500 transition-transform"
            style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0)' }}
          />
        </button>
      </CardHeader>
      {isOpen && (
        <CardContent className="pt-0 pb-2 space-y-1">
          {careLogs.map((log) => (
            <div
              key={log.id}
              className="flex items-center gap-2 py-1.5 border-b border-gray-50 last:border-0 text-sm"
            >
              <span className="text-base leading-none">{CARE_TYPE_ICONS[log.careType] ?? '🌿'}</span>
              <div className="flex-1 min-w-0">
                <span className="font-medium text-gray-700 capitalize">{log.careType}</span>
                {log.notes && <p className="text-xs text-gray-400 truncate">{log.notes}</p>}
              </div>
              <span className="text-xs text-gray-400 flex-shrink-0">
                {new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short' }).format(
                  new Date(log.loggedAt)
                )}
              </span>
            </div>
          ))}
          {careTotal > careLogs.length && (
            <Button variant="ghost" size="sm" asChild className="w-full rounded-full text-xs mt-2">
              <Link href={`/plants/${plantId}/care-logs`}>
                {locale === 'en'
                  ? `View all ${careTotal} entries`
                  : `Преглед всички ${careTotal} записи`}
              </Link>
            </Button>
          )}
        </CardContent>
      )}
    </Card>
  );
}
