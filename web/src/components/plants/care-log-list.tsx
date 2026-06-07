'use client';

import { useState } from 'react';
import { Pencil, Trash2, Check, X } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/hooks/use-toast';

const CARE_TYPE_ICONS: Record<string, string> = {
  watered: '💧', fertilized: '🌱', repotted: '🪴',
  misted: '💦', pruned: '✂️', rotated: '🔄', observation: '👁️',
};

const CARE_TYPE_LABELS: Record<string, { en: string; bg: string }> = {
  watered:     { en: 'Watered',    bg: 'Поливане' },
  fertilized:  { en: 'Fertilized', bg: 'Торене' },
  repotted:    { en: 'Repotted',   bg: 'Преглаждане' },
  misted:      { en: 'Misted',     bg: 'Пръскане' },
  pruned:      { en: 'Pruned',     bg: 'Подрязване' },
  rotated:     { en: 'Rotated',    bg: 'Завъртане' },
  observation: { en: 'Observation', bg: 'Наблюдение' },
};

interface CareLog {
  id: string;
  careType: string;
  notes?: string | null;
  loggedAt: string | Date;
}

interface CareLogListProps {
  plantId: string;
  logs: CareLog[];
  locale: string;
}

export function CareLogList({ plantId, logs, locale }: CareLogListProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftNotes, setDraftNotes] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const en = locale === 'en';

  function startEdit(log: CareLog) {
    setEditingId(log.id);
    setDraftNotes(log.notes ?? '');
  }

  async function saveNotes(logId: string) {
    setBusyId(logId);
    try {
      const res = await fetch(`/api/plants/${plantId}/care-logs/${logId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: draftNotes.trim() || null }),
      });
      if (!res.ok) throw new Error();
      setEditingId(null);
      toast({ title: en ? 'Saved' : 'Запазено', variant: 'success' });
      router.refresh();
    } catch {
      toast({ title: en ? 'Error' : 'Грешка', variant: 'destructive' });
    } finally {
      setBusyId(null);
    }
  }

  async function deleteLog(logId: string) {
    setBusyId(logId);
    try {
      const res = await fetch(`/api/plants/${plantId}/care-logs/${logId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast({ title: en ? 'Entry deleted' : 'Записът е изтрит', variant: 'success' });
      setDeleteId(null);
      router.refresh();
    } catch {
      toast({ title: en ? 'Error' : 'Грешка', variant: 'destructive' });
    } finally {
      setBusyId(null);
    }
  }

  if (logs.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-gray-500">
        {en ? 'No care entries yet.' : 'Все още няма записани грижи.'}
      </p>
    );
  }

  return (
    <>
    <ul className="divide-y divide-gray-100">
      {logs.map((log) => {
        const label = CARE_TYPE_LABELS[log.careType];
        const isEditing = editingId === log.id;
        const busy = busyId === log.id;
        return (
          <li key={log.id} className="flex items-start gap-3 py-3">
            <span className="mt-0.5 text-lg leading-none">{CARE_TYPE_ICONS[log.careType] ?? '🌿'}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-gray-800">
                  {label ? (en ? label.en : label.bg) : log.careType}
                </span>
                <span className="shrink-0 text-xs text-gray-400">
                  {new Intl.DateTimeFormat(locale, {
                    day: '2-digit', month: 'short', year: 'numeric',
                  }).format(new Date(log.loggedAt))}
                </span>
              </div>

              {isEditing ? (
                <div className="mt-2 space-y-2">
                  <textarea
                    value={draftNotes}
                    onChange={(e) => setDraftNotes(e.target.value)}
                    rows={2}
                    placeholder={en ? 'Notes' : 'Бележки'}
                    className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-emerald-400 focus:outline-none"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" className="rounded-full gap-1" isLoading={busy} onClick={() => saveNotes(log.id)}>
                      <Check className="h-3.5 w-3.5" />
                      {en ? 'Save' : 'Запази'}
                    </Button>
                    <Button size="sm" variant="ghost" className="rounded-full gap-1" onClick={() => setEditingId(null)}>
                      <X className="h-3.5 w-3.5" />
                      {en ? 'Cancel' : 'Отказ'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-0.5 flex items-start justify-between gap-2">
                  <p className="min-w-0 flex-1 text-xs text-gray-500">
                    {log.notes || <span className="text-gray-300">—</span>}
                  </p>
                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={() => startEdit(log)}
                      disabled={busy}
                      aria-label={en ? 'Edit notes' : 'Редактирай бележките'}
                      className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteId(log.id)}
                      disabled={busy}
                      aria-label={en ? 'Delete entry' : 'Изтрий записа'}
                      className="rounded-md p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>

    <ConfirmDialog
      open={deleteId !== null}
      onOpenChange={(open) => { if (!open) setDeleteId(null); }}
      title={en ? 'Delete care entry?' : 'Изтриване на запис?'}
      description={en
        ? 'This permanently removes the entry and updates the schedule if needed.'
        : 'Записът се изтрива завинаги и графикът се обновява при нужда.'}
      confirmLabel={en ? 'Delete' : 'Изтрий'}
      cancelLabel={en ? 'Cancel' : 'Отказ'}
      variant="danger"
      isLoading={busyId === deleteId}
      onConfirm={() => { if (deleteId) deleteLog(deleteId); }}
    />
    </>
  );
}
