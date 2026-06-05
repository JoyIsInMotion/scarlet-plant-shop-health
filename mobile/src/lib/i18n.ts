// Lightweight i18n for the mobile app. Copy of the relevant strings from the
// web workspace (web/messages/{bg,en}.json) so the native screens read the same
// way as the website. The active locale follows the signed-in user's
// preferredLocale, defaulting to Bulgarian (the shop's primary language).

import { useAuth } from '@/context/auth';

export type Locale = 'bg' | 'en';

type Dict = typeof bg;

const bg = {
  common: {
    back: 'Назад',
    retry: 'Опитай отново',
    loading: 'Зареждане...',
    error: 'Грешка',
  },
  plants: {
    myPlants: 'Моите растения',
    manageCollection: 'Преглеждайте, редактирайте и следете колекцията си от растения.',
    plantsCount: 'растения',
    noPlants: 'Нямате добавени растения',
    loadError: 'Неуспешно зареждане на растенията.',
    healthScore: 'Здравен резултат',
    lastWatered: 'Последно поливане',
    linked: 'Свързан с каталога',
    speciesConfirmed: 'Видът е потвърден',
    analysisHistory: 'История на анализите',
    plantDetails: 'Детайли за растението',
    archived: 'Архивирано',
    careSchedule: 'График за грижи',
    latestAnalysis: 'Последен AI анализ',
    noAnalysis: 'Все още няма анализ. Стартирайте AI анализ, за да видите оценка на здравето.',
    notFound: 'Растението не е намерено.',
  },
  ai: {
    scanButton: 'Сканирай с AI',
    runAnalysis: 'Стартирай AI анализ',
    analyzing: 'Анализиране...',
    healthScore: 'Здравен резултат',
    issues: 'Открити проблеми',
    noIssues: 'Не са открити проблеми',
    careRecommendations: 'Препоръки за грижи',
    wateringNeeded: 'Необходимо е поливане',
    unknownPlant: 'Неизвестно растение',
    analysisFailed: 'AI анализът не бе успешен. Опитайте отново.',
    condition: {
      excellent: 'Отлично',
      good: 'Добро',
      fair: 'Задоволително',
      poor: 'Лошо',
      critical: 'Критично',
    },
    confidence: {
      label: 'Точност',
      low: 'Ниска увереност',
      medium: 'Средна увереност',
      high: 'Висока увереност',
    },
    careBasics: {
      light: 'Светлина',
      watering: 'Вода',
      drying: 'Сушене',
      temperature: 'Температура',
      humidity: 'Влажност',
      fertilizer: 'Тор',
      soil: 'Почва',
      toxicity: 'Домашни любимци',
    },
  },
  catalog: {
    title: 'Каталог',
    scientificName: 'Научно наименование',
    family: 'Семейство',
    nativeRegion: 'Произход',
    careDifficulty: 'Трудност на отглеждане',
    easy: 'Лесно',
    moderate: 'Умерено',
    difficult: 'Трудно',
  },
  health: {
    excellent: 'Отлично',
    good: 'Добро',
    fair: 'Задоволително',
    poor: 'Лошо',
    critical: 'Критично',
  },
};

const en: Dict = {
  common: {
    back: 'Back',
    retry: 'Retry',
    loading: 'Loading...',
    error: 'Error',
  },
  plants: {
    myPlants: 'My Plants',
    manageCollection: 'Review, edit and track your plant collection.',
    plantsCount: 'plants',
    noPlants: "You haven't added any plants yet",
    loadError: 'Failed to load plants.',
    healthScore: 'Health Score',
    lastWatered: 'Last watered',
    linked: 'Linked to catalog',
    speciesConfirmed: 'Species confirmed',
    analysisHistory: 'Analysis history',
    plantDetails: 'Plant details',
    archived: 'Archived',
    careSchedule: 'Care Schedule',
    latestAnalysis: 'Latest AI analysis',
    noAnalysis: 'No analysis yet. Run an AI analysis to see a health assessment.',
    notFound: 'Plant not found.',
  },
  ai: {
    scanButton: 'Scan with AI',
    runAnalysis: 'Run AI Analysis',
    analyzing: 'Analyzing...',
    healthScore: 'Health score',
    issues: 'Detected issues',
    noIssues: 'No issues detected',
    careRecommendations: 'Care recommendations',
    wateringNeeded: 'Watering needed',
    unknownPlant: 'Unknown plant',
    analysisFailed: 'AI analysis failed. Please try again.',
    condition: {
      excellent: 'Excellent',
      good: 'Good',
      fair: 'Fair',
      poor: 'Poor',
      critical: 'Critical',
    },
    confidence: {
      label: 'Confidence',
      low: 'Low confidence',
      medium: 'Medium confidence',
      high: 'High confidence',
    },
    careBasics: {
      light: 'Light',
      watering: 'Water',
      drying: 'Drying',
      temperature: 'Temperature',
      humidity: 'Humidity',
      fertilizer: 'Fertilizer',
      soil: 'Soil',
      toxicity: 'Pets',
    },
  },
  catalog: {
    title: 'Catalog',
    scientificName: 'Scientific name',
    family: 'Family',
    nativeRegion: 'Native region',
    careDifficulty: 'Care difficulty',
    easy: 'Easy',
    moderate: 'Moderate',
    difficult: 'Difficult',
  },
  health: {
    excellent: 'Excellent',
    good: 'Good',
    fair: 'Fair',
    poor: 'Poor',
    critical: 'Critical',
  },
};

const dictionaries: Record<Locale, Dict> = { bg, en };

export function getMessages(locale: Locale): Dict {
  return dictionaries[locale] ?? bg;
}

/** Returns the active locale + message bundle for the signed-in user. */
export function useI18n(): { locale: Locale; m: Dict } {
  const { user } = useAuth();
  const locale: Locale = user?.preferredLocale === 'en' ? 'en' : 'bg';
  return { locale, m: getMessages(locale) };
}

/** Picks the right side of a localized value that may be a plain string. */
export function pickLocalized(
  value: string | { en: string | null; bg: string | null } | null | undefined,
  locale: Locale
): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  return (locale === 'en' ? value.en : value.bg) ?? value.en ?? value.bg ?? null;
}

/** Resolves a species' display name in the active locale, with fallbacks. */
export function speciesName(
  species:
    | { commonNameBg: string | null; commonNameEn: string | null; scientificName: string }
    | null
    | undefined,
  locale: Locale
): string | null {
  if (!species) return null;
  return locale === 'en'
    ? species.commonNameEn ?? species.commonNameBg ?? species.scientificName
    : species.commonNameBg ?? species.commonNameEn ?? species.scientificName;
}
