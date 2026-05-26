'use client';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Leaf } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { Plant } from '@scarlet/shared';

const schema = z.object({
  customName: z.string().min(1),
  lastWatered: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface PlantEditFormProps {
  plant: Plant & { species?: Plant['species']; imageUrl: string | null };
}

export function PlantEditForm({ plant }: PlantEditFormProps) {
  const t = useTranslations();
  const router = useRouter();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(plant.imageUrl);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      customName: plant.customName,
      lastWatered: plant.lastWatered ? plant.lastWatered.slice(0, 10) : '',
    },
  });

  useEffect(() => {
    reset({
      customName: plant.customName,
      lastWatered: plant.lastWatered ? plant.lastWatered.slice(0, 10) : '',
    });
  }, [plant.customName, plant.lastWatered, reset]);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: t('errors.invalidFileType'), variant: 'destructive' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: t('errors.fileTooLarge'), variant: 'destructive' });
      return;
    }
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
  }

  async function onSubmit(values: FormData) {
    try {
      const res = await fetch(`/api/plants/${plant.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customName: values.customName,
          lastWatered: values.lastWatered ? new Date(values.lastWatered).toISOString() : null,
        }),
      });

      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error ?? t('errors.serverError'));
      }

      if (imageFile) {
        const form = new FormData();
        form.append('image', imageFile);
        const uploadRes = await fetch(`/api/plants/${plant.id}/image`, { method: 'POST', body: form });
        if (!uploadRes.ok) {
          const { error } = await uploadRes.json();
          throw new Error(error ?? t('errors.serverError'));
        }
      }

      toast({ title: t('common.success'), description: t('plants.saveChanges'), variant: 'success' });
      router.push(`/plants/${plant.id}`);
    } catch (error: unknown) {
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('errors.serverError'),
        variant: 'destructive',
      });
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Card className="border-gray-200 shadow-sm">
        <CardContent className="space-y-4 p-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">{t('plants.photo')}</label>
            <div
              className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 transition-colors hover:bg-gray-100"
              onClick={() => fileRef.current?.click()}
            >
              {preview ? (
                <img src={preview} alt={plant.customName} className="h-full w-full object-cover" />
              ) : (
                <>
                  <Leaf className="mb-2 h-10 w-10 text-gray-300" />
                  <p className="text-sm text-gray-500">{t('plants.updateImage')}</p>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">{t('plants.plantName')}</label>
            <Input {...register('customName')} />
            {errors.customName && <p className="mt-1 text-xs text-red-600">{t('errors.required')}</p>}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              {t('plants.lastWatered')} <span className="font-normal text-gray-400">({t('common.optional')})</span>
            </label>
            <Input type="date" {...register('lastWatered')} />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1 rounded-full" asChild>
          <Link href={`/plants/${plant.id}`}>
            <ArrowLeft className="h-4 w-4" />
            {t('common.cancel')}
          </Link>
        </Button>
        <Button type="submit" isLoading={isSubmitting} className="flex-1 rounded-full">
          {t('plants.saveChanges')}
        </Button>
      </div>
    </form>
  );
}
