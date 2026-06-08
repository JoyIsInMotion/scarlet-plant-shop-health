import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['bg', 'en'],
  defaultLocale: 'en',
  localePrefix: 'as-needed',
});
