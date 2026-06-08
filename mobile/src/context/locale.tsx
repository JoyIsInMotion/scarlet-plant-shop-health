import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/auth';
import { getItem, setItem } from '@/lib/storage';
import type { Locale } from '@/lib/i18n';

const LOCALE_KEY = 'app.locale';

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

// Holds the active UI language. A manual choice (persisted) wins; otherwise we
// follow the signed-in user's preferredLocale, defaulting to English.
export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [override, setOverride] = useState<Locale | null>(null);

  useEffect(() => {
    let active = true;
    getItem(LOCALE_KEY)
      .then((value) => {
        if (active && (value === 'bg' || value === 'en')) setOverride(value);
      })
      .catch(() => {
        /* no persisted choice — fall back to the user/default locale */
      });
    return () => {
      active = false;
    };
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setOverride(next);
    setItem(LOCALE_KEY, next).catch(() => {
      /* best-effort persistence */
    });
  }, []);

  const locale: Locale = override ?? (user?.preferredLocale === 'bg' ? 'bg' : 'en');

  const value = useMemo<LocaleContextValue>(() => ({ locale, setLocale }), [locale, setLocale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within a LocaleProvider');
  return ctx;
}
