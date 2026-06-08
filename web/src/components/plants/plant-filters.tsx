'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

type Difficulty = 'easy' | 'moderate' | 'difficult' | '';

interface PlantFiltersProps {
  initialSearch: string;
  initialDifficulty: string;
  allParams: Record<string, string>;
}

export function PlantFilters({ initialSearch, initialDifficulty, allParams }: PlantFiltersProps) {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState(initialSearch);

  function buildUrl(overrides: Record<string, string>) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(allParams)) {
      if (k !== 'page') params.set(k, v);
    }
    for (const [k, v] of Object.entries(overrides)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  // Debounce search → URL
  useEffect(() => {
    if (search === initialSearch) return;
    const timer = setTimeout(() => {
      router.push(buildUrl({ search }));
    }, 400);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function setDifficulty(value: Difficulty) {
    router.push(buildUrl({ difficulty: value }));
  }

  const DIFFICULTIES: Array<{ value: Difficulty; label: string }> = [
    { value: '', label: t('catalog.allDifficulties') },
    { value: 'easy', label: t('catalog.easy') },
    { value: 'moderate', label: t('catalog.moderate') },
    { value: 'difficult', label: t('catalog.difficult') },
  ];

  const activeDifficulty = (initialDifficulty ?? '') as Difficulty;
  const isFiltering = search.trim().length > 0 || activeDifficulty !== '';

  return (
    <div className="space-y-3">
      {/* Search input */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('plants.searchPlants')}
          className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-9 text-sm placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
        {search && (
          <button
            type="button"
            onClick={() => { setSearch(''); router.push(buildUrl({ search: '' })); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Difficulty filter chips */}
      <div className="flex flex-wrap gap-2">
        {DIFFICULTIES.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setDifficulty(value)}
            className={cn(
              'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
              activeDifficulty === value
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'border border-gray-200 bg-white text-gray-600 hover:border-emerald-300 hover:text-emerald-700'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Clear all filters link */}
      {isFiltering && (
        <button
          type="button"
          onClick={() => { setSearch(''); router.push(buildUrl({ search: '', difficulty: '' })); }}
          className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2"
        >
          {t('plants.clearFilters')}
        </button>
      )}
    </div>
  );
}
