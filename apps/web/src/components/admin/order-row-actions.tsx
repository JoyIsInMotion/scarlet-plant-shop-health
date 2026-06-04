'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircle2, Trash2, Loader2 } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { useToast } from '@/hooks/use-toast';

const ORDER_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'] as const;

export function OrderRowActions({ orderId, status }: { orderId: string; status: string }) {
  const t = useTranslations();
  const router = useRouter();
  const { toast } = useToast();
  const [current, setCurrent] = useState(status);
  const [isPending, startTransition] = useTransition();

  async function patch(body: Record<string, unknown>) {
    const res = await fetch(`/api/admin/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: null }));
      throw new Error(error ?? 'Update failed');
    }
  }

  function changeStatus(next: string) {
    const prev = current;
    setCurrent(next);
    startTransition(async () => {
      try {
        await patch({ status: next });
        toast({ title: t('common.success'), variant: 'success' });
        router.refresh();
      } catch (e) {
        setCurrent(prev);
        toast({
          title: t('common.error'),
          description: e instanceof Error ? e.message : t('errors.serverError'),
          variant: 'destructive',
        });
      }
    });
  }

  function complete() {
    changeStatus('delivered');
  }

  function remove() {
    if (!window.confirm(t('admin.deleteOrderConfirm'))) return;
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/orders/${orderId}`, { method: 'DELETE' });
        if (!res.ok) {
          const { error } = await res.json().catch(() => ({ error: null }));
          throw new Error(error ?? 'Delete failed');
        }
        toast({ title: t('admin.orderDeleted'), variant: 'success' });
        router.refresh();
      } catch (e) {
        toast({
          title: t('common.error'),
          description: e instanceof Error ? e.message : t('errors.serverError'),
          variant: 'destructive',
        });
      }
    });
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {isPending && <Loader2 className="h-4 w-4 animate-spin text-muted" />}

      <select
        aria-label={t('admin.changeStatus')}
        value={current}
        disabled={isPending}
        onChange={(e) => changeStatus(e.target.value)}
        className="h-8 rounded-lg border border-border bg-surface px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-scarlet/30 disabled:opacity-50"
      >
        {ORDER_STATUSES.map((s) => (
          <option key={s} value={s}>{t(`orders.status.${s}`)}</option>
        ))}
      </select>

      <button
        type="button"
        onClick={complete}
        disabled={isPending || current === 'delivered'}
        title={t('admin.markComplete')}
        className="inline-flex h-8 items-center gap-1 rounded-lg border border-green-200 bg-green-50 px-2.5 text-xs font-semibold text-green-700 transition-colors hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <CheckCircle2 className="h-3.5 w-3.5" />
        {t('admin.complete')}
      </button>

      <button
        type="button"
        onClick={remove}
        disabled={isPending}
        title={t('common.delete')}
        className="inline-flex h-8 items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-40"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
