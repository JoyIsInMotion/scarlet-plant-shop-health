import { getLocale, getTranslations } from 'next-intl/server';
import { Leaf, SlidersHorizontal, Users } from 'lucide-react';
import { Pagination } from '@/components/ui/pagination';
import { LikeButton } from '@/components/community/like-button';
import { getAccessToken } from '@/lib/auth/cookies';
import { verifyAccessToken } from '@/lib/auth/jwt';
import * as communityService from '@/services/community.service';
import type { Metadata } from 'next';

const PAGE_SIZE = 20;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('community');
  return { title: t('title') };
}

async function getCurrentUserId(): Promise<string | undefined> {
  try {
    const token = await getAccessToken();
    if (!token) return undefined;
    return verifyAccessToken(token).sub;
  } catch {
    return undefined;
  }
}

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const t = await getTranslations();
  const locale = await getLocale();
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? '1', 10));
  const offset = (page - 1) * PAGE_SIZE;

  const currentUserId = await getCurrentUserId();

  const { plants, total } = await communityService.listCommunityPlants({
    limit: PAGE_SIZE,
    offset,
    search: sp.search || undefined,
    difficulty: sp.difficulty || undefined,
    currentUserId,
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

  function getPlantDisplayName(p: typeof plants[number]) {
    const speciesName = locale === 'en'
      ? (p.commonNameEn ?? p.commonNameBg)
      : (p.commonNameBg ?? p.commonNameEn);
    return p.customName !== speciesName ? p.customName : (speciesName ?? p.customName);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">

      {/* Header */}
      <div className="mb-8 border-b border-border pb-6">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.28em] text-scarlet">
          {t('community.title')}
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {t('community.title')}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {t('community.subtitle')}&nbsp;·&nbsp;
          <span className="font-medium text-foreground">
            {total} {locale === 'en' ? 'plants' : 'растения'}
          </span>
        </p>
      </div>

      {/* Filters */}
      <form method="get" className="mb-8">
        <div className="flex flex-wrap items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-muted" />
          <input
            name="search"
            defaultValue={sp.search ?? ''}
            placeholder={t('community.searchPlaceholder')}
            className="h-9 min-w-[160px] flex-1 rounded-xl border border-border bg-surface px-3 text-sm text-foreground placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-scarlet/30 sm:flex-none"
          />
          <select
            name="difficulty"
            defaultValue={sp.difficulty ?? ''}
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

      {/* Grid */}
      {plants.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted">
          <Leaf className="mb-3 h-10 w-10 opacity-20" />
          <p className="text-sm">{t('common.noResults')}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {plants.map((plant) => {
              const photo = plant.imageUrl ?? plant.speciesImageUrl;
              const speciesName = locale === 'en'
                ? (plant.commonNameEn ?? plant.commonNameBg)
                : (plant.commonNameBg ?? plant.commonNameEn);

              return (
                <div
                  key={plant.id}
                  className="flex flex-col overflow-hidden rounded-2xl border border-border-light bg-surface transition-all duration-200 hover:border-border hover:shadow-lg hover:shadow-scarlet/5"
                >
                  {/* Image */}
                  <div className="relative aspect-square overflow-hidden bg-cream">
                    {photo ? (
                      <img
                        src={photo}
                        alt={plant.customName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Leaf className="h-10 w-10 text-border" />
                      </div>
                    )}
                    {plant.careDifficulty && (
                      <span className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold ${difficultyStyle[plant.careDifficulty] ?? 'bg-subtle text-muted'}`}>
                        {t(`catalog.${plant.careDifficulty as 'easy' | 'moderate' | 'difficult'}`)}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex flex-1 flex-col p-3.5">
                    <p className="truncate font-semibold text-sm text-foreground">{getPlantDisplayName(plant)}</p>
                    {speciesName && (
                      <p className="mt-0.5 truncate text-xs italic text-muted-light">{speciesName}</p>
                    )}

                    <div className="mt-auto flex items-center justify-between pt-2.5">
                      <span className="flex items-center gap-1 text-xs text-muted">
                        <Users className="h-3 w-3" />
                        {plant.ownerName}
                      </span>
                      <LikeButton
                        plantId={plant.id}
                        initialLiked={Boolean(plant.isLiked)}
                        initialCount={plant.likesCount ?? 0}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <Pagination
            page={page}
            total={total}
            limit={PAGE_SIZE}
            getHref={(p) => {
              const params = new URLSearchParams();
              if (sp.search) params.set('search', sp.search);
              if (sp.difficulty) params.set('difficulty', sp.difficulty);
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
