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
