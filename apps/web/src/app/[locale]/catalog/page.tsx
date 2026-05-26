import { getLocale, getTranslations } from 'next-intl/server';
import { CheckCircle2, Leaf } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from '@/i18n/navigation';
import { listSpecies } from '@/services/catalog.service';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('catalog');
  return { title: t('title') };
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const t = await getTranslations();
  const locale = await getLocale();
  const sp = await searchParams;
  const { species, total } = await listSpecies({
    limit: 24,
    offset: parseInt(sp.offset ?? '0', 10),
    search: sp.search || undefined,
    difficulty: sp.careDifficulty || undefined,
    verifiedOnly: false,
  });

  const difficulties = [
    { value: '', label: t('catalog.allDifficulties') },
    { value: 'easy', label: t('catalog.easy') },
    { value: 'moderate', label: t('catalog.moderate') },
    { value: 'difficult', label: t('catalog.difficult') },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 rounded-3xl border border-emerald-100 bg-gradient-to-br from-white via-white to-emerald-50 p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-600">{t('catalog.title')}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">{t('catalog.title')}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600 sm:text-base">{t('catalog.subtitle')}</p>
        <p className="mt-3 text-sm font-medium text-gray-500">{total} {locale === 'en' ? 'species' : 'вида'}</p>
      </div>

      {/* Filters */}
      <form method="get" className="flex flex-col sm:flex-row gap-3 mb-6">
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
              <Card className="group h-full overflow-hidden border-gray-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                <div className="relative aspect-[4/3] bg-gray-100">
                  {s.imageUrl ? (
                    <img
                      src={s.imageUrl}
                      alt={locale === 'en'
                        ? (s.commonNameEn ?? s.commonNameBg ?? s.scientificName)
                        : (s.commonNameBg ?? s.commonNameEn ?? s.scientificName)}
                      className="h-full w-full object-cover"
                    />
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
                <CardContent className="space-y-1.5 pt-3 pb-4">
                  <p className="truncate font-semibold text-gray-900">
                    {locale === 'en'
                      ? (s.commonNameEn ?? s.commonNameBg ?? s.scientificName)
                      : (s.commonNameBg ?? s.commonNameEn ?? s.scientificName)}
                  </p>
                  <p className="mt-0.5 truncate text-xs italic text-gray-400">{s.scientificName}</p>
                  {s.careDifficulty && (
                    <Badge
                      className="mt-2 rounded-full"
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
