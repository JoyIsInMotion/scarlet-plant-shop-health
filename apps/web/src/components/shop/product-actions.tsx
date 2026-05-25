'use client';
import { ShoppingBag } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useCart } from '@/hooks/use-cart';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface ProductActionsProps {
  product: {
    id: string;
    nameBg: string;
    nameEn: string;
    price: string;
    category: string;
    imageUrl: string | null;
    stock: number;
    slug: string;
  };
}

export function ProductActions({ product }: ProductActionsProps) {
  const t = useTranslations();
  const locale = useLocale();
  const { add } = useCart();
  const { toast } = useToast();

  const name = locale === 'en' ? product.nameEn : product.nameBg;
  const price = new Intl.NumberFormat(locale === 'en' ? 'en' : 'bg', {
    style: 'currency',
    currency: 'BGN',
    maximumFractionDigits: 2,
  }).format(Number(product.price));

  function handleAddToCart() {
    add({ id: product.id, name, price: Number(product.price), imageUrl: product.imageUrl });
    toast({ title: t('shop.addToCart'), description: name, variant: 'success' });
  }

  return (
    <Card className="border-gray-200 shadow-sm">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-gray-500">{t('shop.price')}</p>
            <p className="text-3xl font-semibold tracking-tight text-gray-900">{price}</p>
          </div>
          <Badge variant="default" className="rounded-full">
            {t(`shop.category.${product.category as 'bouquet' | 'potted_plant' | 'succulent' | 'tropical' | 'seasonal' | 'accessories'}`)}
          </Badge>
        </div>

        <div className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-600">
          <p className="font-medium text-gray-900">{product.stock > 0 ? t('shop.inStock') : t('shop.outOfStock')}</p>
          <p className="mt-1">{product.stock > 0 ? `${product.stock} ${locale === 'en' ? 'items available' : 'бр.'}` : t('shop.outOfStock')}</p>
        </div>

        <Button onClick={handleAddToCart} disabled={product.stock === 0} className="w-full rounded-2xl">
          <ShoppingBag className="h-4 w-4" />
          {product.stock === 0 ? t('shop.outOfStock') : t('shop.addToCart')}
        </Button>
      </CardContent>
    </Card>
  );
}
