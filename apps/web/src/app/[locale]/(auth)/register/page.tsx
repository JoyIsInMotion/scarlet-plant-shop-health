'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Flower2 } from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});
type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const t = useTranslations();
  const { refresh } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error ?? t('errors.serverError'));
      }
      await refresh();
      router.push('/dashboard');
    } catch (err: unknown) {
      toast({
        title: t('common.error'),
        description: err instanceof Error ? err.message : t('errors.serverError'),
        variant: 'destructive',
      });
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
            <Flower2 className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-2xl">{t('auth.registerTitle')}</CardTitle>
          <p className="text-sm text-gray-500 mt-1">{t('auth.registerSubtitle')}</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {t('auth.name')}
              </label>
              <Input placeholder="Иван Иванов" autoComplete="name" {...register('name')} />
              {errors.name && <p className="mt-1 text-xs text-red-600">{t('errors.required')}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {t('auth.email')}
              </label>
              <Input type="email" placeholder="you@example.com" autoComplete="email" {...register('email')} />
              {errors.email && <p className="mt-1 text-xs text-red-600">{t('errors.invalidEmail')}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {t('auth.password')}
              </label>
              <Input type="password" placeholder="••••••••" autoComplete="new-password" {...register('password')} />
              {errors.password && <p className="mt-1 text-xs text-red-600">{t('errors.passwordTooShort')}</p>}
            </div>

            <Button type="submit" className="w-full" isLoading={isSubmitting}>
              {t('auth.registerButton')}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            {t('auth.haveAccount')}{' '}
            <Link href="login" className="font-medium text-red-600 hover:text-red-700">
              {t('auth.login')}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
