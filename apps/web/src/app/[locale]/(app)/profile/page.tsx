'use client';
import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { Camera } from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { LanguageSwitcher } from '@/components/layout/language-switcher';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ProfilePage() {
  const t = useTranslations();
  const { user, refresh } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, formState: { isSubmitting } } = useForm({
    values: { name: user?.name ?? '', email: user?.email ?? '' },
  });

  async function onSubmit(data: { name: string; email: string }) {
    try {
      const res = await fetch('/api/users/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error();
      await refresh();
      toast({ title: t('profile.savedChanges'), variant: 'success' });
    } catch {
      toast({ title: t('common.error'), variant: 'destructive' });
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setSaving(true);
    try {
      const form = new FormData();
      form.append('avatar', f);
      const res = await fetch('/api/users/me/avatar', { method: 'POST', body: form });
      if (!res.ok) throw new Error();
      await refresh();
      toast({ title: t('profile.savedChanges'), variant: 'success' });
    } catch {
      toast({ title: t('common.error'), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('profile.title')}</h1>

      <div className="space-y-4">
        {/* Avatar */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar src={user?.avatarUrl} fallback={user?.name ?? ''} size="xl" />
                <button
                  onClick={() => fileRef.current?.click()}
                  className="absolute bottom-0 right-0 rounded-full bg-red-600 p-1.5 text-white hover:bg-red-700 shadow"
                  disabled={saving}
                >
                  <Camera className="h-3.5 w-3.5" />
                </button>
              </div>
              <div>
                <p className="font-semibold text-gray-900">{user?.name}</p>
                <p className="text-sm text-gray-500">{user?.email}</p>
                <p className="text-xs text-gray-400 capitalize mt-0.5">{user?.role}</p>
              </div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </CardContent>
        </Card>

        {/* Edit profile */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('profile.editProfile')}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('auth.name')}</label>
                <Input {...register('name')} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('auth.email')}</label>
                <Input type="email" {...register('email')} />
              </div>
              <Button type="submit" isLoading={isSubmitting}>{t('common.save')}</Button>
            </form>
          </CardContent>
        </Card>

        {/* Language */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">{t('profile.language')}</p>
                <p className="text-sm text-gray-500">{t('profile.bulgarian')} / {t('profile.english')}</p>
              </div>
              <LanguageSwitcher />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
