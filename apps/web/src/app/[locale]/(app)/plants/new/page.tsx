'use client';
import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Upload, Leaf } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

const schema = z.object({
  customName: z.string().min(1),
  lastWatered: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function NewPlantPage() {
  const t = useTranslations();
  const router = useRouter();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      toast({ title: t('errors.fileTooLarge'), variant: 'destructive' });
      return;
    }
    setImageFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function onSubmit(data: FormData) {
    try {
      // Create plant
      const res = await fetch('/api/plants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customName: data.customName,
          lastWatered: data.lastWatered || null,
        }),
      });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error);
      }
      const { data: plant } = await res.json();

      // Upload image if selected
      if (imageFile && plant.id) {
        const form = new FormData();
        form.append('image', imageFile);
        await fetch(`/api/plants/${plant.id}/image`, { method: 'POST', body: form });
      }

      toast({ title: t('common.success'), variant: 'success' });
      router.push(`/plants/${plant.id}`);
    } catch (err: unknown) {
      toast({
        title: t('common.error'),
        description: err instanceof Error ? err.message : t('errors.serverError'),
        variant: 'destructive',
      });
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-8 sm:px-6">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link href="dashboard"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">{t('plants.addPlant')}</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Photo upload */}
        <Card>
          <CardContent className="pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('plants.photo')}</label>
            <div
              className="aspect-[4/3] rounded-lg bg-gray-50 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              {preview ? (
                <img src={preview} alt="preview" className="h-full w-full rounded-lg object-cover" />
              ) : (
                <>
                  <Leaf className="h-10 w-10 text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500">{t('plants.uploadPhoto')}</p>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </CardContent>
        </Card>

        {/* Name */}
        <Card>
          <CardContent className="pt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('plants.plantName')} *</label>
              <Input placeholder="Моята роза" {...register('customName')} />
              {errors.customName && <p className="mt-1 text-xs text-red-600">{t('errors.required')}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {t('plants.lastWatered')} <span className="text-gray-400 font-normal">({t('common.optional')})</span>
              </label>
              <Input type="date" {...register('lastWatered')} />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button variant="outline" asChild className="flex-1">
            <Link href="dashboard">{t('common.cancel')}</Link>
          </Button>
          <Button type="submit" isLoading={isSubmitting} className="flex-1">
            {t('common.save')}
          </Button>
        </div>
      </form>
    </div>
  );
}
