'use client';
import { useEffect, useState, useTransition } from 'react';
import { useParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import {
  ArrowLeft, Loader2, Save, CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Link, useRouter } from '@/i18n/navigation';

interface Species {
  id: string;
  commonNameBg: string | null;
  commonNameEn: string | null;
  scientificName: string;
  family: string | null;
  nativeRegionBg: string | null;
  nativeRegionEn: string | null;
  careDifficulty: string | null;
  descriptionBg: string | null;
  descriptionEn: string | null;
  imageUrl: string | null;
  isVerified: boolean;
  wateringIntervalDays: number | null;
  fertilizingIntervalDays: number | null;
  repottingIntervalMonths: number | null;
  mistingNeeded: boolean;
  careGuide: Record<string, { bg: string; en: string }> | null;
}

const CARE_KEYS = ['light', 'watering', 'humidity', 'temperature', 'fertilizer'] as const;

export default function AdminCatalogEditPage() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const { toast } = useToast();

  const [species, setSpecies] = useState<Species | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Form state
  const [form, setForm] = useState({
    commonNameEn: '',
    commonNameBg: '',
    scientificName: '',
    family: '',
    nativeRegionEn: '',
    nativeRegionBg: '',
    careDifficulty: '',
    descriptionEn: '',
    descriptionBg: '',
    imageUrl: '',
    isVerified: false,
    wateringIntervalDays: '',
    fertilizingIntervalDays: '',
    repottingIntervalMonths: '',
    mistingNeeded: false,
  });

  const [careGuide, setCareGuide] = useState<Record<string, { bg: string; en: string }>>({});

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/catalog/${id}`);
        if (!res.ok) { router.push('/admin'); return; }
        const { data } = await res.json();
        setSpecies(data);
        setForm({
          commonNameEn: data.commonNameEn ?? '',
          commonNameBg: data.commonNameBg ?? '',
          scientificName: data.scientificName ?? '',
          family: data.family ?? '',
          nativeRegionEn: data.nativeRegionEn ?? '',
          nativeRegionBg: data.nativeRegionBg ?? '',
          careDifficulty: data.careDifficulty ?? '',
          descriptionEn: data.descriptionEn ?? '',
          descriptionBg: data.descriptionBg ?? '',
          imageUrl: data.imageUrl ?? '',
          isVerified: data.isVerified ?? false,
          wateringIntervalDays: data.wateringIntervalDays != null ? String(data.wateringIntervalDays) : '',
          fertilizingIntervalDays: data.fertilizingIntervalDays != null ? String(data.fertilizingIntervalDays) : '',
          repottingIntervalMonths: data.repottingIntervalMonths != null ? String(data.repottingIntervalMonths) : '',
          mistingNeeded: data.mistingNeeded ?? false,
        });
        const guide: Record<string, { bg: string; en: string }> = {};
        for (const key of CARE_KEYS) {
          guide[key] = {
            en: data.careGuide?.[key]?.en ?? '',
            bg: data.careGuide?.[key]?.bg ?? '',
          };
        }
        setCareGuide(guide);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, router]);

  function set(field: keyof typeof form, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function setCareField(key: string, lang: 'en' | 'bg', value: string) {
    setCareGuide((prev) => ({
      ...prev,
      [key]: { ...prev[key], [lang]: value },
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        const payload = {
          commonNameEn: form.commonNameEn || null,
          commonNameBg: form.commonNameBg || null,
          scientificName: form.scientificName,
          family: form.family || null,
          nativeRegionEn: form.nativeRegionEn || null,
          nativeRegionBg: form.nativeRegionBg || null,
          careDifficulty: form.careDifficulty || null,
          descriptionEn: form.descriptionEn || null,
          descriptionBg: form.descriptionBg || null,
          imageUrl: form.imageUrl || null,
          isVerified: form.isVerified,
          wateringIntervalDays: form.wateringIntervalDays ? parseInt(form.wateringIntervalDays) : null,
          fertilizingIntervalDays: form.fertilizingIntervalDays ? parseInt(form.fertilizingIntervalDays) : null,
          repottingIntervalMonths: form.repottingIntervalMonths ? parseInt(form.repottingIntervalMonths) : null,
          mistingNeeded: form.mistingNeeded,
          careGuide,
        };

        const res = await fetch(`/api/catalog/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const { error } = await res.json();
          throw new Error(error ?? 'Save failed');
        }

        toast({ title: t('common.success'), variant: 'success' });
        router.push(`/catalog/${id}`);
      } catch (err: unknown) {
        toast({
          title: t('common.error'),
          description: err instanceof Error ? err.message : t('errors.serverError'),
          variant: 'destructive',
        });
      }
    });
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted" />
      </div>
    );
  }

  if (!species) return null;

  const isBg = locale === 'bg';
  const displayName = isBg
    ? (species.commonNameBg ?? species.commonNameEn ?? species.scientificName)
    : (species.commonNameEn ?? species.commonNameBg ?? species.scientificName);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/catalog/${id}`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <p className="text-xs text-muted uppercase tracking-widest">{t('admin.manageCatalog')}</p>
          <h1 className="text-xl font-bold text-gray-900">{displayName}</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Names */}
        <Card>
          <CardContent className="pt-4 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">{t('admin.catalog')}</p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Common name (EN)</label>
                <Input value={form.commonNameEn} onChange={(e) => set('commonNameEn', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Общо наименование (BG)</label>
                <Input value={form.commonNameBg} onChange={(e) => set('commonNameBg', e.target.value)} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('catalog.scientificName')} *</label>
              <Input
                required
                value={form.scientificName}
                onChange={(e) => set('scientificName', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('catalog.family')}</label>
                <Input value={form.family} onChange={(e) => set('family', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('catalog.careDifficulty')}</label>
                <select
                  value={form.careDifficulty}
                  onChange={(e) => set('careDifficulty', e.target.value)}
                  className="w-full h-9 rounded-xl border border-border bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-scarlet/30"
                >
                  <option value="">{t('catalog.allDifficulties')}</option>
                  <option value="easy">{t('catalog.easy')}</option>
                  <option value="moderate">{t('catalog.moderate')}</option>
                  <option value="difficult">{t('catalog.difficult')}</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Native region (EN)</label>
                <Input value={form.nativeRegionEn} onChange={(e) => set('nativeRegionEn', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Произход (BG)</label>
                <Input value={form.nativeRegionBg} onChange={(e) => set('nativeRegionBg', e.target.value)} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Image URL</label>
              <Input
                placeholder="https://..."
                value={form.imageUrl}
                onChange={(e) => set('imageUrl', e.target.value)}
              />
              {form.imageUrl && (
                <img
                  src={form.imageUrl}
                  alt="preview"
                  className="mt-2 h-24 w-24 rounded-xl object-cover border border-border"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                id="isVerified"
                type="checkbox"
                checked={form.isVerified}
                onChange={(e) => set('isVerified', e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-scarlet focus:ring-scarlet"
              />
              <label htmlFor="isVerified" className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                {t('catalog.verified')}
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Descriptions */}
        <Card>
          <CardContent className="pt-4 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Descriptions</p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Description (EN)</label>
              <textarea
                rows={3}
                value={form.descriptionEn}
                onChange={(e) => set('descriptionEn', e.target.value)}
                className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-scarlet/30 resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Описание (BG)</label>
              <textarea
                rows={3}
                value={form.descriptionBg}
                onChange={(e) => set('descriptionBg', e.target.value)}
                className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-scarlet/30 resize-none"
              />
            </div>
          </CardContent>
        </Card>

        {/* Care intervals */}
        <Card>
          <CardContent className="pt-4 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Care Intervals</p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Watering (days)</label>
                <Input
                  type="number"
                  min={1}
                  value={form.wateringIntervalDays}
                  onChange={(e) => set('wateringIntervalDays', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Fertilizing (days)</label>
                <Input
                  type="number"
                  min={1}
                  value={form.fertilizingIntervalDays}
                  onChange={(e) => set('fertilizingIntervalDays', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Repotting (months)</label>
                <Input
                  type="number"
                  min={1}
                  value={form.repottingIntervalMonths}
                  onChange={(e) => set('repottingIntervalMonths', e.target.value)}
                />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.mistingNeeded}
                    onChange={(e) => set('mistingNeeded', e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-scarlet focus:ring-scarlet"
                  />
                  Misting needed
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Care guide */}
        <Card>
          <CardContent className="pt-4 space-y-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">{t('catalog.careGuide')}</p>
            {CARE_KEYS.map((key) => (
              <div key={key} className="space-y-2">
                <p className="text-sm font-semibold capitalize text-gray-700">{key}</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">EN</label>
                    <textarea
                      rows={2}
                      value={careGuide[key]?.en ?? ''}
                      onChange={(e) => setCareField(key, 'en', e.target.value)}
                      className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-scarlet/30 resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">BG</label>
                    <textarea
                      rows={2}
                      value={careGuide[key]?.bg ?? ''}
                      onChange={(e) => setCareField(key, 'bg', e.target.value)}
                      className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-scarlet/30 resize-none"
                    />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button variant="outline" asChild className="flex-1">
            <Link href={`/catalog/${id}`}>{t('common.cancel')}</Link>
          </Button>
          <Button type="submit" isLoading={isPending} className="flex-1 gap-2">
            <Save className="h-4 w-4" />
            {t('common.save')}
          </Button>
        </div>
      </form>
    </div>
  );
}
