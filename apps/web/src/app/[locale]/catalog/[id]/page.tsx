import { getTranslations, getLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Leaf } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from '@/i18n/navigation';
import type { Metadata } from 'next';

async function getSpecies(id: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const res = await fetch(`${base}/api/catalog/${id}`, { cache: 'no-store' });
  if (!res.ok) return null;
  const { data } = await res.json();
  return data;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const species = await getSpecies(id);
  return { title: species?.commonNameBg ?? species?.scientificName ?? 'Species' };
}

export default async function SpeciesDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTranslations();
  const locale = await getLocale();
  const species = await getSpecies(id);
  if (!species) notFound();

  const name = locale === 'en' ? (species.commonNameEn ?? species.commonNameBg) : (species.commonNameBg ?? species.commonNameEn);
  const description = locale === 'en' ? species.descriptionEn : species.descriptionBg;
  const nativeRegion = locale === 'en' ? species.nativeRegionEn : species.nativeRegionBg;
  const careGuide = species.careGuide as Record<string, { bg: string; en: string }> | null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/catalog"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900 truncate">{name}</h1>
            {species.isVerified && <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />}
          </div>
          <p className="italic text-gray-500 text-sm">{species.scientificName}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        {/* Image */}
        <div>
          <div className="aspect-[4/3] rounded-3xl overflow-hidden bg-gray-100 shadow-sm">
            {species.imageUrl ? (
              <img src={species.imageUrl} alt={name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center">
                <Leaf className="h-16 w-16 text-gray-300" />
              </div>
            )}
          </div>

          {description && (
            <p className="mt-4 text-sm text-gray-600 leading-relaxed">{description}</p>
          )}
        </div>

        {/* Info */}
        <div className="space-y-4">
          <Card className="border-gray-200 shadow-sm">
            <CardContent className="pt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-xs text-gray-500">{t('catalog.family')}</span>
                  <p className="font-medium mt-0.5">{species.family ?? '—'}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">{t('catalog.nativeRegion')}</span>
                  <p className="font-medium mt-0.5">{nativeRegion ?? '—'}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">{t('catalog.careDifficulty')}</span>
                  <div className="mt-0.5">
                    {species.careDifficulty ? (
                      <Badge variant={
                        species.careDifficulty === 'easy' ? 'success' :
                        species.careDifficulty === 'moderate' ? 'warning' : 'danger'
                      }>
                        {t(`catalog.${species.careDifficulty as 'easy' | 'moderate' | 'difficult'}`)}
                      </Badge>
                    ) : '—'}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-gray-500">{t('catalog.usersGrowing')}</span>
                  <p className="font-medium mt-0.5">{species.usersGrowing ?? 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Care guide */}
          {careGuide && Object.keys(careGuide).length > 0 && (
            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t('catalog.careGuide')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                {Object.entries(careGuide).map(([key, val]) => (
                  <div key={key}>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{key}</p>
                    <p className="text-sm text-gray-700 mt-0.5">
                      {locale === 'en' ? val.en : val.bg}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
