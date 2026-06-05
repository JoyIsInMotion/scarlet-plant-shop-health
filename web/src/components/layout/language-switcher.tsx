'use client';
import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { useTransition } from 'react';
import { cn } from '@/lib/utils/cn';

export function LanguageSwitcher({ className }: { className?: string }) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function switchLocale(next: 'bg' | 'en') {
    if (next === locale) return;

    // Strip current locale prefix if present, then add new one
    const stripped = pathname.replace(/^\/(bg|en)/, '') || '/';
    const newPath = next === 'bg' ? stripped : `/en${stripped}`;

    document.cookie = `NEXT_LOCALE=${next}; path=/; max-age=31536000`;

    startTransition(() => {
      router.push(newPath);
      router.refresh();
    });
  }

  return (
    <div className={cn('flex items-center gap-0.5 text-sm font-medium', className)}>
      <button
        onClick={() => switchLocale('bg')}
        disabled={isPending}
        className={cn(
          'px-2 py-1 rounded transition-colors',
          locale === 'bg'
            ? 'text-red-600 font-semibold'
            : 'text-gray-500 hover:text-gray-900'
        )}
      >
        BG
      </button>
      <span className="text-gray-300">|</span>
      <button
        onClick={() => switchLocale('en')}
        disabled={isPending}
        className={cn(
          'px-2 py-1 rounded transition-colors',
          locale === 'en'
            ? 'text-red-600 font-semibold'
            : 'text-gray-500 hover:text-gray-900'
        )}
      >
        EN
      </button>
    </div>
  );
}
