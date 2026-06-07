'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { ShieldCheck, ShieldOff, UserCheck, UserX } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

interface UserAdminActionsProps {
  userId: string;
  role: 'user' | 'admin';
  isActive: boolean;
  phone: string | null;
}

export function UserAdminActions({ userId, role, isActive, phone }: UserAdminActionsProps) {
  const t = useTranslations();
  const router = useRouter();
  const { toast } = useToast();
  const [phoneVal, setPhoneVal] = useState(phone ?? '');
  const [pending, startTransition] = useTransition();

  function patch(body: Record<string, unknown>) {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/users/${userId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const { error } = await res.json().catch(() => ({ error: null }));
          throw new Error(error ?? t('errors.serverError'));
        }
        toast({ title: t('admin.userUpdated'), variant: 'success' });
        router.refresh();
      } catch (e) {
        toast({
          title: t('common.error'),
          description: e instanceof Error ? e.message : undefined,
          variant: 'destructive',
        });
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={pending}
          onClick={() => patch({ role: role === 'admin' ? 'user' : 'admin' })}
        >
          {role === 'admin' ? <ShieldOff className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
          {role === 'admin' ? t('admin.removeAdmin') : t('admin.makeAdmin')}
        </Button>
        <Button
          variant={isActive ? 'destructive' : 'default'}
          size="sm"
          className="gap-1.5"
          disabled={pending}
          onClick={() => patch({ isActive: !isActive })}
        >
          {isActive ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
          {isActive ? t('admin.deactivate') : t('admin.activate')}
        </Button>
      </div>

      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-gray-500">{t('admin.phone')}</label>
          <Input value={phoneVal} onChange={(e) => setPhoneVal(e.target.value)} placeholder="+359 ..." />
        </div>
        <Button size="sm" disabled={pending} onClick={() => patch({ phone: phoneVal })}>
          {t('common.save')}
        </Button>
      </div>
    </div>
  );
}
