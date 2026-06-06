'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Leaf, Upload, X, Search, AlertCircle } from 'lucide-react';
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
  speciesId: z.string().optional(),
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
  const [photos, setPhotos] = useState<Array<{ id: string; imageUrl: string; uploadedAt: string }>>([]);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(true);
  const [speciesSearch, setSpeciesSearch] = useState('');
  const [speciesSuggestions, setSpeciesSuggestions] = useState<Array<{ id: string; commonNameEn?: string; commonNameBg?: string; scientificName: string }>>([]);
  const [selectedSpeciesId, setSelectedSpeciesId] = useState<string | null>(plant.speciesId ?? null);
  const [isSearchingSpecies, setIsSearchingSpecies] = useState(false);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      customName: plant.customName,
      lastWatered: plant.lastWatered ? plant.lastWatered.slice(0, 10) : '',
    },
  });

  // Load existing photos
  useEffect(() => {
    async function loadPhotos() {
      try {
        const res = await fetch(`/api/plants/${plant.id}/photos`);
        if (res.ok) {
          const data = await res.json();
          setPhotos(data);
        }
      } catch (error) {
        console.error('Failed to load photos:', error);
      } finally {
        setIsLoadingPhotos(false);
      }
    }
    loadPhotos();
  }, [plant.id]);

  // Search species with debouncing
  const searchSpecies = useCallback(
    async (query: string) => {
      if (query.length < 2) {
        setSpeciesSuggestions([]);
        return;
      }
      setIsSearchingSpecies(true);
      try {
        const res = await fetch(`/api/catalog?search=${encodeURIComponent(query)}&limit=5`);
        if (res.ok) {
          const { data } = await res.json();
          setSpeciesSuggestions(data.species || []);
        }
      } catch (error) {
        console.error('Failed to search species:', error);
      } finally {
        setIsSearchingSpecies(false);
      }
    },
    []
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      searchSpecies(speciesSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [speciesSearch, searchSpecies]);

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

  async function handleAddPhoto(file: File) {
    try {
      const form = new FormData();
      form.append('image', file);
      const uploadRes = await fetch(`/api/plants/${plant.id}/photos`, {
        method: 'POST',
        body: form,
      });

      if (!uploadRes.ok) {
        const { error } = await uploadRes.json();
        throw new Error(error ?? t('errors.serverError'));
      }

      const newPhoto = await uploadRes.json();
      setPhotos([newPhoto, ...photos]);
      toast({ title: t('common.success'), description: 'Photo added', variant: 'success' });
    } catch (error: unknown) {
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('errors.serverError'),
        variant: 'destructive',
      });
    }
  }

  async function handleDeletePhoto(photoId: string) {
    try {
      const res = await fetch(`/api/plants/${plant.id}/photos/${photoId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error ?? t('errors.serverError'));
      }

      setPhotos(photos.filter((p) => p.id !== photoId));
      toast({ title: t('common.success'), variant: 'success' });
    } catch (error: unknown) {
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('errors.serverError'),
        variant: 'destructive',
      });
    }
  }

  async function onSubmit(values: FormData) {
    try {
      const res = await fetch(`/api/plants/${plant.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customName: values.customName,
          lastWatered: values.lastWatered ? new Date(values.lastWatered).toISOString() : null,
          speciesId: selectedSpeciesId || undefined,
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
          {/* Main image upload */}
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

          {/* Additional photos gallery */}
          {!isLoadingPhotos && photos.length > 0 && (
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                {t('plants.additionalPhotos')} ({photos.length})
              </label>
              <div className="grid grid-cols-3 gap-2">
                {photos.map((photo) => (
                  <div key={photo.id} className="relative group">
                    <img
                      src={photo.imageUrl}
                      alt="Plant photo"
                      className="h-20 w-full object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => handleDeletePhoto(photo.id)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add more photos button */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">{t('plants.addMorePhotos')}</label>
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-lg border-dashed"
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = async (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) {
                    await handleAddPhoto(file);
                  }
                };
                input.click();
              }}
            >
              <Upload className="h-4 w-4 mr-2" />
              {t('plants.uploadPhoto')}
            </Button>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">{t('plants.plantName')}</label>
            <Input {...register('customName')} />
            {errors.customName && <p className="mt-1 text-xs text-red-600">{t('errors.required')}</p>}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              {t('plants.species')} <span className="font-normal text-gray-400">({t('common.optional')})</span>
            </label>
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <Input
                  type="text"
                  placeholder={t('plants.searchSpecies') || 'Search species...'}
                  value={speciesSearch}
                  onChange={(e) => setSpeciesSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              {speciesSearch.length >= 2 && (isSearchingSpecies || speciesSuggestions.length > 0) && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                  {isSearchingSpecies && speciesSuggestions.length === 0 && (
                    <p className="px-3 py-2 text-sm text-gray-400">{t('common.loading')}</p>
                  )}
                  {speciesSuggestions.map((species) => (
                    <button
                      key={species.id}
                      type="button"
                      onClick={() => {
                        setSelectedSpeciesId(species.id);
                        setSpeciesSearch('');
                        setSpeciesSuggestions([]);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b last:border-0"
                    >
                      <p className="font-medium text-sm text-gray-900">
                        {species.commonNameEn || species.commonNameBg || species.scientificName}
                      </p>
                      <p className="text-xs text-gray-500 italic">{species.scientificName}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selectedSpeciesId && (
              <div className="mt-2 flex items-center gap-2 p-2 bg-emerald-50 rounded-lg border border-emerald-200">
                <AlertCircle className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <span className="text-sm text-emerald-700">{t('plants.linked')}</span>
                <button
                  type="button"
                  onClick={() => setSelectedSpeciesId(null)}
                  className="ml-auto text-emerald-600 hover:text-emerald-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
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
