import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { CheckCircle2, Leaf } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('catalog');
  return { title: t('title') };
}

async function getSpecies(searchParams: Record<string, string>) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const params = new URLSearchParams({ limit: '24', ...searchParams });
  const res = await fetch(`${base}/api/catalog?${params}`, { cache: 'no-store' });
  if (!res.ok) return { species: [], total: 0 };
  const { data } = await res.json();
  return { species: data?.species ?? [], total: data?.total ?? 0 };
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const t = await getTranslations();
  const sp = await searchParams;
  const { species, total } = await getSpecies(sp);

  const difficulties = [
    { value: '', label: t('catalog.allDifficulties') },
    { value: 'easy', label: t('catalog.easy') },
    { value: 'moderate', label: t('catalog.moderate') },
    { value: 'difficult', label: t('catalog.difficult') },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('catalog.title')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('catalog.subtitle')} · {total} вида</p>
      </div>

      {/* Filters */}
      <form className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          name="search"
          defaultValue={sp.search ?? ''}
          placeholder={t('catalog.search')}
          className="flex-1 h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
        />
        <select
          name="careDifficulty"
          defaultValue={sp.careDifficulty ?? ''}
          className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          {difficulties.map((d) => (
            <option key={d.value} value={d.value}>{d.label}</option>
          ))}
        </select>
        <button
          type="submit"
          className="h-10 px-4 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors"
        >
          {t('common.search')}
        </button>
      </form>

      {species.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Leaf className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>{t('common.noResults')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {species.map((s: {
            id: string;
            commonNameBg: string | null;
            commonNameEn: string | null;
            scientificName: string;
            careDifficulty: string | null;
            isVerified: boolean;
            imageUrl: string | null;
          }) => (
            <Link key={s.id} href={`/catalog/${s.id}`}>
              <Card className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer h-full">
                <div className="aspect-[4/3] bg-gray-100 relative">
                  {s.imageUrl ? (
                    <img src={s.imageUrl} alt={s.commonNameBg ?? s.scientificName} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Leaf className="h-10 w-10 text-gray-300" />
                    </div>
                  )}
                  {s.isVerified && (
                    <span className="absolute top-2 right-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500 fill-white" />
                    </span>
                  )}
                </div>
                <CardContent className="pt-3 pb-4">
                  <p className="font-semibold text-gray-900 truncate">
                    {s.commonNameBg ?? s.commonNameEn ?? s.scientificName}
                  </p>
                  <p className="text-xs italic text-gray-400 truncate mt-0.5">{s.scientificName}</p>
                  {s.careDifficulty && (
                    <Badge
                      className="mt-2"
                      variant={s.careDifficulty === 'easy' ? 'success' : s.careDifficulty === 'moderate' ? 'warning' : 'danger'}
                    >
                      {t(`catalog.${s.careDifficulty as 'easy' | 'moderate' | 'difficult'}`)}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
