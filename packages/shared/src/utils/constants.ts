export const USER_ROLES = ['user', 'admin'] as const;
export const LOCALES = ['bg', 'en'] as const;
export const DEFAULT_LOCALE = 'bg' as const;

export const METRIC_TYPES = ['water', 'light', 'humidity', 'temperature', 'fertilizer'] as const;

export const CARE_DIFFICULTIES = ['easy', 'moderate', 'difficult'] as const;

export const PRODUCT_CATEGORIES = [
  'bouquet',
  'potted_plant',
  'succulent',
  'tropical',
  'seasonal',
  'accessories',
] as const;

export const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
] as const;

export const AI_CONFIDENCE_LEVELS = ['low', 'medium', 'high'] as const;
export const AI_CONDITIONS = ['excellent', 'good', 'fair', 'poor', 'critical'] as const;

export const MAX_FILE_SIZE_MB = 5;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export const AI_RATE_LIMIT_PER_DAY = 5;
export const DEFAULT_PAGE_LIMIT = 20;
export const MAX_PAGE_LIMIT = 100;
