import { getTranslations, getLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import {
  ArrowLeft, CheckCircle2, Leaf, Sun, Droplets, Wind,
  Thermometer, RefreshCw, Users, Pencil, Shield,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { getAccessToken } from '@/lib/auth/cookies';
import { verifyAccessToken } from '@/lib/auth/jwt';
import type { Metadata } from 'next';

async function getSpecies(id: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const res = await fetch(`${base}/api/catalog/${id}`, { cache: 'no-store' });
  if (!res.ok) return null;
  const { data } = await res.json();
  return data;
}

const CARE_CONFIG = [
  {
    key: 'light',
    Icon: Sun,
    iconClass: 'text-amber-500',
    bgClass: 'bg-amber-50',
    borderClass: 'border-amber-100',
    labelEn: 'Light',
    labelBg: 'Светлина',
  },
  {
    key: 'watering',
    Icon: Droplets,
    iconClass: 'text-blue-500',
    bgClass: 'bg-blue-50',
    borderClass: 'border-blue-100',
    labelEn: 'Watering',
    labelBg: 'Поливане',
  },
  {
    key: 'humidity',
    Icon: Wind,
    iconClass: 'text-sky-500',
    bgClass: 'bg-sky-50',
    borderClass: 'border-sky-100',
    labelEn: 'Humidity',
    labelBg: 'Влажност',
  },
  {
    key: 'temperature',
    Icon: Thermometer,
    iconClass: 'text-orange-500',
    bgClass: 'bg-orange-50',
    borderClass: 'border-orange-100',
    labelEn: 'Temperature',
    labelBg: 'Температура',
  },
  {
    key: 'fertilizer',
    Icon: Leaf,
    iconClass: 'text-green-600',
    bgClass: 'bg-green-50',
    borderClass: 'border-green-100',
    labelEn: 'Fertilizer',
    labelBg: 'Тор',
  },
  {
    key: 'toxicity',
    Icon: Shield,
    iconClass: 'text-violet-500',
    bgClass: 'bg-violet-50',
    borderClass: 'border-violet-100',
    labelEn: 'Pet Safety',
    labelBg: 'Домашни любимци',
  },
] as const;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const species = await getSpecies(id);
  return { title: species?.commonNameBg ?? species?.scientificName ?? 'Species' };
}

async function getIsAdmin(): Promise<boolean> {
  try {
    const token = await getAccessToken();
    if (!token) return false;
    const payload = verifyAccessToken(token);
    return payload.role === 'admin';
  } catch {
    return false;
  }
}

export default async function SpeciesDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTranslations();
  const locale = await getLocale();
  const [species, isAdmin] = await Promise.all([getSpecies(id), getIsAdmin()]);
  if (!species) notFound();

  const isBg = locale === 'bg';
  const name = isBg
    ? (species.commonNameBg ?? species.commonNameEn)
    : (species.commonNameEn ?? species.commonNameBg);
  const description = isBg ? species.descriptionBg : species.descriptionEn;
  const careGuide = species.careGuide as Record<string, { bg: string; en: string }> | null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">

      {/* Back + admin edit */}
      <div className="mb-6 flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild className="gap-1.5 text-gray-500 hover:text-gray-700 -ml-2">
          <Link href="/catalog">
            <ArrowLeft className="h-4 w-4" />
            {t('common.back')}
          </Link>
        </Button>
        {isAdmin && (
          <Button variant="outline" size="sm" asChild className="gap-1.5">
            <Link href={`/admin/catalog/${id}/edit`}>
              <Pencil className="h-3.5 w-3.5" />
              {t('common.edit')}
            </Link>
          </Button>
        )}
      </div>

      {/* Hero — image + info */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 mb-12">

        {/* Image */}
        <div className="aspect-[4/3] rounded-3xl overflow-hidden bg-gray-100 shadow-sm">
          {species.imageUrl ? (
            <img src={species.imageUrl} alt={name ?? species.scientificName} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Leaf className="h-16 w-16 text-gray-300" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col justify-center gap-5">

          {/* Name */}
          <div>
            <div className="flex items-start gap-2 flex-wrap">
              <h1 className="text-3xl font-bold text-gray-900 leading-tight">{name}</h1>
              {species.isVerified && (
                <CheckCircle2 className="h-5 w-5 text-green-500 mt-1.5 flex-shrink-0" />
              )}
            </div>
            <p className="italic text-gray-400 text-sm mt-1">{species.scientificName}</p>

            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {species.careDifficulty && (
                <Badge variant={
                  species.careDifficulty === 'easy' ? 'success' :
                  species.careDifficulty === 'moderate' ? 'warning' : 'danger'
                }>
                  {t(`catalog.${species.careDifficulty as 'easy' | 'moderate' | 'difficult'}`)}
                </Badge>
              )}
              {species.isToxicToPets === false && (
                <span className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 border border-green-200 px-2.5 py-1 rounded-full font-medium">
                  <Shield className="h-3 w-3" />
                  {isBg ? 'Безопасно за домашни любимци' : 'Pet Safe'}
                </span>
              )}
              {species.isToxicToPets === true && (
                <span className="inline-flex items-center gap-1 text-xs bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded-full font-medium">
                  <Shield className="h-3 w-3" />
                  {isBg ? 'Токсично за домашни любимци' : 'Toxic to Pets'}
                </span>
              )}
              {species.family && (
                <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                  {species.family}
                </span>
              )}
            </div>
          </div>

          {/* Interval chips */}
          <div className="flex flex-wrap gap-2">
            {species.wateringIntervalDays != null && (
              <span className="inline-flex items-center gap-1.5 text-xs bg-blue-50 text-blue-700 border border-blue-100 rounded-full px-3 py-1.5 font-medium">
                <Droplets className="h-3.5 w-3.5" />
                {isBg
                  ? `Поливане на ${species.wateringIntervalDays} дни`
                  : `Water every ${species.wateringIntervalDays}d`}
              </span>
            )}
            {species.fertilizingIntervalDays != null && (
              <span className="inline-flex items-center gap-1.5 text-xs bg-green-50 text-green-700 border border-green-100 rounded-full px-3 py-1.5 font-medium">
                <Leaf className="h-3.5 w-3.5" />
                {isBg
                  ? `Тор на ${species.fertilizingIntervalDays} дни`
                  : `Fertilize every ${species.fertilizingIntervalDays}d`}
              </span>
            )}
            {species.repottingIntervalMonths != null && (
              <span className="inline-flex items-center gap-1.5 text-xs bg-amber-50 text-amber-700 border border-amber-100 rounded-full px-3 py-1.5 font-medium">
                <RefreshCw className="h-3.5 w-3.5" />
                {isBg
                  ? `Презасади на ${species.repottingIntervalMonths} мес`
                  : `Repot every ${species.repottingIntervalMonths}mo`}
              </span>
            )}
            {species.mistingNeeded && (
              <span className="inline-flex items-center gap-1.5 text-xs bg-sky-50 text-sky-700 border border-sky-100 rounded-full px-3 py-1.5 font-medium">
                <Wind className="h-3.5 w-3.5" />
                {isBg ? 'Изисква пръскане' : 'Misting needed'}
              </span>
            )}
          </div>

          {/* Description */}
          {description && (
            <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
          )}

          {/* Users growing */}
          {species.usersGrowing > 0 && (
            <p className="flex items-center gap-1.5 text-xs text-gray-400">
              <Users className="h-3.5 w-3.5" />
              {isBg
                ? `${species.usersGrowing} потребители отглеждат този вид`
                : `${species.usersGrowing} ${t('catalog.usersGrowing')}`}
            </p>
          )}
        </div>
      </div>

      {/* Care guide */}
      {careGuide && Object.keys(careGuide).length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
            {t('catalog.careGuide')}
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {CARE_CONFIG.map(({ key, Icon, iconClass, bgClass, borderClass, labelEn, labelBg }) => {
              const entry = careGuide[key];
              if (!entry) return null;
              const text = isBg ? entry.bg : entry.en;
              const label = isBg ? labelBg : labelEn;
              if (!text) return null;
              return (
                <div key={key} className={`rounded-2xl border p-4 ${bgClass} ${borderClass}`}>
                  <div className="inline-flex rounded-xl bg-white p-2 shadow-sm mb-3">
                    <Icon className={`h-5 w-5 ${iconClass}`} />
                  </div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    {label}
                  </p>
                  <p className="text-sm text-gray-700 leading-snug">{text}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Metadata footer */}
      {(species.nativeRegionEn || species.nativeRegionBg || species.family) && (
        <div className="mt-8 pt-6 border-t border-gray-100 flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-500">
          {species.family && (
            <span>
              <span className="text-gray-400 text-xs uppercase tracking-wide mr-1.5">{t('catalog.family')}</span>
              {species.family}
            </span>
          )}
          {(isBg ? species.nativeRegionBg : species.nativeRegionEn) && (
            <span>
              <span className="text-gray-400 text-xs uppercase tracking-wide mr-1.5">{t('catalog.nativeRegion')}</span>
              {isBg ? species.nativeRegionBg : species.nativeRegionEn}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
