'use client';
import { useTranslations } from 'next-intl';
import { ShoppingBag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useCart } from '@/hooks/use-cart';
import { useToast } from '@/hooks/use-toast';

interface Product {
  id: string;
  nameBg: string;
  nameEn: string;
  price: number;
  category: string;
  imageUrl: string | null;
  stock: number;
  slug: string;
}

interface ShopClientProps {
  products: Product[];
  total: number;
  locale: string;
  initialParams: Record<string, string>;
}

const CATEGORIES = [
  'bouquet', 'potted_plant', 'succulent', 'tropical', 'seasonal', 'accessories',
] as const;

export function ShopClient({ products, total, locale, initialParams }: ShopClientProps) {
  const t = useTranslations();
  const { add } = useCart();
  const { toast } = useToast();

  function getName(p: Product) {
    return locale === 'en' ? p.nameEn : p.nameBg;
  }

  function handleAddToCart(p: Product) {
    add({ id: p.id, name: getName(p), price: p.price, imageUrl: p.imageUrl });
    toast({ title: t('shop.addToCart'), description: getName(p), variant: 'success' });
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('shop.title')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('shop.subtitle')} · {total} продукта</p>
      </div>

      {/* Category filters */}
      <form className="flex flex-wrap gap-2 mb-6">
        <input name="search" defaultValue={initialParams.search ?? ''} placeholder={t('common.search')}
          className="flex-1 min-w-48 h-9 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
        <select name="category" defaultValue={initialParams.category ?? ''}
          className="h-9 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
          <option value="">{t('shop.allCategories')}</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{t(`shop.category.${c}`)}</option>
          ))}
        </select>
        <button type="submit" className="h-9 px-4 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors">
          {t('common.search')}
        </button>
      </form>

      {products.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <ShoppingBag className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>{t('common.noResults')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((p) => (
            <Card key={p.id} className="overflow-hidden flex flex-col">
              <div className="aspect-[4/3] bg-gray-100 overflow-hidden">
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt={getName(p)} className="h-full w-full object-cover hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <ShoppingBag className="h-10 w-10 text-gray-300" />
                  </div>
                )}
              </div>
              <CardContent className="pt-3 pb-4 flex flex-col flex-1">
                <p className="font-semibold text-gray-900 line-clamp-2 flex-1">{getName(p)}</p>
                <Badge variant="default" className="mt-1 w-fit">{t(`shop.category.${p.category as typeof CATEGORIES[number]}`)}</Badge>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="text-lg font-bold text-gray-900">{p.price.toFixed(2)} лв.</span>
                  <Button
                    size="sm"
                    onClick={() => handleAddToCart(p)}
                    disabled={p.stock === 0}
                  >
                    <ShoppingBag className="h-3.5 w-3.5" />
                    {p.stock === 0 ? t('shop.outOfStock') : t('shop.addToCart')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
