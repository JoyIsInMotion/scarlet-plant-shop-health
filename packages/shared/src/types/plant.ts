export type MetricType = 'water' | 'light' | 'humidity' | 'temperature' | 'fertilizer';
export type CareDifficulty = 'easy' | 'moderate' | 'difficult';
export type AICondition = 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
export type AIConfidence = 'low' | 'medium' | 'high';

export interface PlantSpecies {
  id: string;
  commonNameBg: string | null;
  commonNameEn: string | null;
  scientificName: string;
  family: string | null;
  nativeRegionBg: string | null;
  nativeRegionEn: string | null;
  careDifficulty: CareDifficulty | null;
  descriptionBg: string | null;
  descriptionEn: string | null;
  careGuide: Record<string, { bg: string; en: string }> | null;
  imageUrl: string | null;
  isVerified: boolean;
  createdAt: string;
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

export interface PlantStat {
  id: string;
  plantId: string;
  metricType: MetricType;
  value: number;
  unit: string | null;
  notes: string | null;
  recordedAt: string;
}

export interface AIIssue {
  name: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
}

export interface AIAnalysis {
  id: string;
  plantId: string | null;
  userId: string;
  imageUrl: string;
  healthScore: number | null;
  overallCondition: AICondition | null;
  issues: AIIssue[];
  careRecommendations: string[];
  wateringNeeded: boolean | null;
  identifiedCommonName: string | null;
  identifiedScientificName: string | null;
  identifiedFamily: string | null;
  identifiedNativeRegion: string | null;
  identifiedCareDifficulty: CareDifficulty | null;
  confidence: AIConfidence | null;
  matchedSpeciesId: string | null;
  matchedSpecies?: PlantSpecies | null;
  modelUsed: string;
  analyzedAt: string;
}
