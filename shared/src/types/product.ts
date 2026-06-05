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
