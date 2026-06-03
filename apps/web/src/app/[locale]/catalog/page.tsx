import { getLocale, getTranslations } from 'next-intl/server';
import { CheckCircle2, Flower2, SlidersHorizontal } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Pagination } from '@/components/ui/pagination';
import { listSpecies } from '@/services/catalog.service';
import type { Metadata } from 'next';

const PAGE_SIZE = 24;

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
  const page = Math.max(1, parseInt(sp.page ?? '1', 10));
  const offset = (page - 1) * PAGE_SIZE;
  const { species, total } = await listSpecies({
    limit: PAGE_SIZE,
    offset,
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

  const difficultyStyle: Record<string, string> = {
    easy: 'bg-botanical-light text-botanical-dark',
    moderate: 'bg-amber-50 text-amber-700',
    difficult: 'bg-scarlet-light text-scarlet-dark',
  };

  function getLocalName(s: { commonNameBg: string | null; commonNameEn: string | null; scientificName: string }) {
    return locale === 'en'
      ? (s.commonNameEn ?? s.commonNameBg ?? s.scientificName)
      : (s.commonNameBg ?? s.commonNameEn ?? s.scientificName);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">

      {/* ── Page header ── */}
      <div className="mb-8 border-b border-border pb-6">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.28em] text-scarlet">
          {t('catalog.title')}
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {t('catalog.title')}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {t('catalog.subtitle')}&nbsp;·&nbsp;
          <span className="font-medium text-foreground">
            {total} {locale === 'en' ? 'species' : 'вида'}
          </span>
        </p>
      </div>

      {/* ── Filters ── */}
      <form method="get" className="mb-8">
        <div className="flex flex-wrap items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-muted" />
          <input
            name="search"
            defaultValue={sp.search ?? ''}
            placeholder={t('catalog.search')}
            className="h-9 min-w-[160px] flex-1 rounded-xl border border-border bg-surface px-3 text-sm text-foreground placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-scarlet/30 sm:flex-none"
          />
          <select
            name="careDifficulty"
            defaultValue={sp.careDifficulty ?? ''}
            className="h-9 rounded-xl border border-border bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-scarlet/30"
          >
            {difficulties.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
          <button
            type="submit"
            className="h-9 rounded-xl bg-scarlet px-5 text-sm font-semibold text-white transition-colors hover:bg-scarlet-dark"
          >
            {t('common.search')}
          </button>
        </div>
      </form>

      {/* ── Grid ── */}
      {species.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted">
          <Flower2 className="mb-3 h-10 w-10 opacity-20" />
          <p className="text-sm">{t('common.noResults')}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
                <div className="group flex flex-col overflow-hidden rounded-2xl border border-border-light bg-surface transition-all duration-200 hover:border-border hover:shadow-lg hover:shadow-scarlet/5">
                  {/* Image */}
                  <div className="relative aspect-square overflow-hidden bg-cream">
                    {s.imageUrl ? (
                      <img
                        src={s.imageUrl}
                        alt={getLocalName(s)}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Flower2 className="h-10 w-10 text-border" />
                      </div>
                    )}
                    {s.isVerified && (
                      <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-surface shadow-sm">
                        <CheckCircle2 className="h-4 w-4 text-botanical" />
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-3.5">
                    <p className="truncate font-semibold text-sm text-foreground">{getLocalName(s)}</p>
                    <p className="mt-0.5 truncate text-xs italic text-muted-light">{s.scientificName}</p>
                    {s.careDifficulty && (
                      <span
                        className={`mt-2.5 inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${difficultyStyle[s.careDifficulty] ?? 'bg-subtle text-muted'}`}
                      >
                        {t(`catalog.${s.careDifficulty as 'easy' | 'moderate' | 'difficult'}`)}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <Pagination
            page={page}
            total={total}
            limit={PAGE_SIZE}
            getHref={(p) => {
              const params = new URLSearchParams();
              if (sp.search) params.set('search', sp.search);
              if (sp.careDifficulty) params.set('careDifficulty', sp.careDifficulty);
              params.set('page', String(p));
              return `?${params.toString()}`;
            }}
            className="mt-8"
          />
        </>
      )}
    </div>
  );
}
