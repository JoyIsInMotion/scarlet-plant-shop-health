'use client';
import { useState, useRef, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations, useLocale } from 'next-intl';
import { ArrowLeft, Leaf, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { toSupportedImage } from '@/lib/images/to-supported-image';
import { Link, useRouter } from '@/i18n/navigation';

const schema = z.object({
  customName: z.string().min(1),
  lastWatered: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

interface IdentifyResult {
  identified: boolean;
  confidence: string;
  commonNameEn?: string | null;
  scientificName?: string | null;
  matchedSpeciesId?: string | null;
  matchedCommonNameEn?: string | null;
  matchedCommonNameBg?: string | null;
  inOurDatabase?: boolean;
}

export default function NewPlantPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [preview, setPreview]               = useState<string | null>(null);
  const [imageFile, setImageFile]           = useState<File | null>(null);
  const [identifying, startIdentifying]     = useTransition();
  const [identification, setIdentification] = useState<IdentifyResult | null>(null);
  const [speciesId, setSpeciesId]           = useState<string | null>(null);
  const [speciesConfirmed, setSpeciesConfirmed] = useState(false);

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function identifySpecies(file: File) {
    const form = new FormData();
    form.append('image', file);
    try {
      const res = await fetch('/api/ai/identify', { method: 'POST', body: form });
      if (!res.ok) return;
      const { data } = await res.json();
      setIdentification(data);
      // Auto-fill plant name from AI result if field is empty
      if (data.identified) {
        const name = locale === 'bg'
          ? (data.matchedCommonNameBg ?? data.matchedCommonNameEn ?? data.commonNameEn)
          : (data.matchedCommonNameEn ?? data.commonNameEn);
        if (name) setValue('customName', name, { shouldValidate: true });
      }
    } catch {
      // silent — identification is optional
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.files?.[0];
    if (!raw) return;
    // Convert iPhone HEIC photos to JPEG so phone uploads work everywhere.
    let f: File;
    try {
      f = await toSupportedImage(raw);
    } catch {
      toast({
        title: t('errors.invalidFileType'),
        description: locale === 'en' ? 'Use JPEG, PNG, WebP or HEIC.' : 'Използвайте JPEG, PNG, WebP или HEIC.',
        variant: 'destructive',
      });
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      toast({ title: t('errors.fileTooLarge'), variant: 'destructive' });
      return;
    }
    setImageFile(f);
    setPreview(URL.createObjectURL(f));
    setIdentification(null);
    setSpeciesId(null);
    setSpeciesConfirmed(false);
    startIdentifying(() => { identifySpecies(f); });
  }

  function confirmSpecies() {
    if (identification?.matchedSpeciesId) {
      setSpeciesId(identification.matchedSpeciesId);
      setSpeciesConfirmed(true);
    }
  }

  function rejectSpecies() {
    setSpeciesId(null);
    setSpeciesConfirmed(false);
    setIdentification(prev => prev ? { ...prev, matchedSpeciesId: null } : null);
  }

  async function onSubmit(data: FormData) {
    try {
      const res = await fetch('/api/plants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customName: data.customName,
          lastWatered: data.lastWatered ? new Date(data.lastWatered).toISOString() : null,
          speciesId:   speciesConfirmed ? speciesId : null,
        }),
      });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error);
      }
      const { data: plant } = await res.json();

      if (imageFile && plant.id) {
        const form = new FormData();
        form.append('image', imageFile);
        const imgRes = await fetch(`/api/plants/${plant.id}/image`, { method: 'POST', body: form });
        if (!imgRes.ok) {
          // Don't fail the whole save, but tell the user the photo didn't attach.
          toast({
            title: locale === 'en' ? 'Plant saved — but the photo failed to upload' : 'Растението е запазено — но снимката не се качи',
            variant: 'destructive',
          });
          router.push(`/plants/${plant.id}`);
          return;
        }
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

  const suggestedName = identification?.identified
    ? (locale === 'bg'
        ? (identification.matchedCommonNameBg ?? identification.matchedCommonNameEn ?? identification.commonNameEn)
        : (identification.matchedCommonNameEn ?? identification.commonNameEn))
    : null;

  return (
    <div className="mx-auto max-w-xl px-4 py-8 sm:px-6">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">{t('plants.addPlant')}</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Photo upload */}
        <Card>
          <CardContent className="pt-4 space-y-3">
            <label className="block text-sm font-medium text-gray-700">{t('plants.photo')}</label>
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
                  <p className="text-xs text-gray-400 mt-1">
                    {locale === 'en' ? 'We\'ll identify the species automatically' : 'Ще разпознаем вида автоматично'}
                  </p>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*,.heic,.heif" className="hidden" onChange={handleFileChange} />

            {/* AI identification result */}
            {identifying && (
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                <Loader2 className="h-4 w-4 animate-spin" />
                {locale === 'en' ? 'Identifying species…' : 'Разпознаване на вид…'}
              </div>
            )}

            {!identifying && identification?.identified && !speciesConfirmed && identification.matchedSpeciesId && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                <p className="text-sm font-medium text-emerald-800">
                  {locale === 'en' ? '🌿 We think this is ' : '🌿 Мислим, че това е '}
                  <span className="font-semibold">{suggestedName}</span>
                  {identification.scientificName && (
                    <span className="text-xs text-emerald-600 font-normal italic ml-1">({identification.scientificName})</span>
                  )}
                </p>
                <p className="text-xs text-emerald-600 mt-0.5">
                  {locale === 'en'
                    ? 'A care schedule will be auto-generated from our species database.'
                    : 'График за грижи ще се генерира автоматично от нашата база данни.'}
                </p>
                <div className="flex gap-2 mt-2">
                  <Button type="button" size="sm" className="rounded-full h-7 text-xs gap-1" onClick={confirmSpecies}>
                    <CheckCircle className="h-3.5 w-3.5" />
                    {locale === 'en' ? 'Yes, that\'s correct' : 'Да, правилно е'}
                  </Button>
                  <Button type="button" size="sm" variant="outline" className="rounded-full h-7 text-xs gap-1" onClick={rejectSpecies}>
                    <XCircle className="h-3.5 w-3.5" />
                    {locale === 'en' ? 'Not this one' : 'Не е правилно'}
                  </Button>
                </div>
              </div>
            )}

            {!identifying && identification?.identified && speciesConfirmed && (
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-700">
                <CheckCircle className="h-4 w-4" />
                <span>
                  {locale === 'en' ? 'Species confirmed: ' : 'Вид потвърден: '}
                  <span className="font-medium">{suggestedName}</span>
                </span>
                <button type="button" onClick={rejectSpecies} className="ml-auto text-emerald-500 hover:text-emerald-700">
                  <XCircle className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Identified, but not in our catalog — still show the AI guess */}
            {!identifying && identification?.identified && !identification.matchedSpeciesId && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                <p className="text-sm text-emerald-800">
                  {locale === 'en' ? '🌿 Looks like ' : '🌿 Прилича на '}
                  <span className="font-semibold">{identification.commonNameEn ?? identification.scientificName}</span>
                  {identification.scientificName && identification.commonNameEn && (
                    <span className="ml-1 text-xs font-normal italic text-emerald-600">({identification.scientificName})</span>
                  )}
                </p>
                <p className="mt-0.5 text-xs text-emerald-600">
                  {locale === 'en'
                    ? 'We filled in the name. This one isn\'t in our species catalog yet — you can link a species later for a care schedule.'
                    : 'Попълнихме името. Този вид още го няма в каталога ни — можете да свържете вид по-късно за график за грижи.'}
                </p>
              </div>
            )}

            {!identifying && identification && !identification.identified && (
              <p className="text-xs text-gray-500 rounded-lg bg-gray-50 px-3 py-2">
                {locale === 'en'
                  ? 'Couldn\'t identify the species — you can link it manually later.'
                  : 'Не можахме да разпознаем вида — можете да го свържете ръчно по-късно.'}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Name + watered */}
        <Card>
          <CardContent className="pt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('plants.plantName')} *</label>
              <Input placeholder={t('plants.namePlaceholder')} {...register('customName')} />
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
            <Link href="/dashboard">{t('common.cancel')}</Link>
          </Button>
          <Button type="submit" isLoading={isSubmitting} className="flex-1">
            {t('common.save')}
          </Button>
        </div>
      </form>
    </div>
  );
}
