// Mirrors the relevant subset of the backend API shapes (see web/src/app/api).
// Kept local to avoid coupling the Expo/Metro bundle to the monorepo's shared
// package resolution.

export type UserRole = 'user' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl: string | null;
  isActive: boolean;
  preferredLocale: 'bg' | 'en';
  createdAt: string;
  updatedAt: string;
}

export interface LoginResult {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export type ProductCategory =
  | 'bouquet'
  | 'potted_plant'
  | 'succulent'
  | 'tropical'
  | 'seasonal'
  | 'accessories';

export interface Product {
  id: string;
  nameBg: string;
  nameEn: string;
  descriptionBg: string | null;
  descriptionEn: string | null;
  price: string;
  category: ProductCategory;
  imageUrl: string | null;
  stock: number;
  slug: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductList {
  items: Product[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

// ─── Plants ──────────────────────────────────────────────────────────────────

export type CareDifficulty = 'easy' | 'moderate' | 'difficult';
export type AICondition = 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
export type AIConfidence = 'low' | 'medium' | 'high';

export interface PlantSpecies {
  id: string;
  commonNameBg: string | null;
  commonNameEn: string | null;
  scientificName: string;
  family?: string | null;
  nativeRegionBg?: string | null;
  nativeRegionEn?: string | null;
  careDifficulty: CareDifficulty | null;
  imageUrl: string | null;
}

export interface Plant {
  id: string;
  userId: string;
  speciesId: string | null;
  species?: PlantSpecies | null;
  customName: string;
  healthScore: number;
  lastWatered: string | null;
  imageUrl: string | null;
  isArchived: boolean;
  speciesConfirmed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PlantList {
  plants: Plant[];
  total: number | null;
  hasMore: boolean;
  nextCursor: string | null;
}

// Issues/recommendations may arrive either as plain strings or as a localized
// { bg, en } object — the backend has produced both shapes over time.
export type Localized = string | { en: string; bg: string };

export interface AIIssue {
  name: Localized;
  severity: 'low' | 'medium' | 'high';
  description: Localized;
}

export interface AIAnalysis {
  id: string;
  plantId: string | null;
  userId: string;
  imageUrl: string;
  healthScore: number | null;
  overallCondition: AICondition | null;
  issues: AIIssue[] | null;
  careRecommendations: Localized[] | null;
  wateringNeeded: boolean | null;
  identifiedCommonName: string | null;
  identifiedScientificName: string | null;
  identifiedFamily: string | null;
  identifiedNativeRegion: string | null;
  identifiedCareDifficulty: CareDifficulty | null;
  confidence: AIConfidence | null;
  matchedSpeciesId: string | null;
  modelUsed: string;
  analyzedAt: string;
}

export interface AnalysisList {
  analyses: AIAnalysis[];
  total: number;
}

export interface AIAnalysisResult {
  analysis: AIAnalysis;
  matchedSpecies: PlantSpecies | null;
  // friendly_advice is a localized { en, bg } object (string tolerated for safety).
  advice: Localized | null;
  careBasics: Record<string, { en: string | null; bg: string | null }> | null;
}
