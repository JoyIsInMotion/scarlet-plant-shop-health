'use client';
import { useState } from 'react';
import { ShoppingBag, Minus, Plus } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useCart } from '@/hooks/use-cart';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

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
  const { add, update, items } = useCart();
  const { toast } = useToast();
  const [qty, setQty] = useState(1);

  const name = locale === 'en' ? product.nameEn : product.nameBg;
  const price = new Intl.NumberFormat(locale === 'en' ? 'en' : 'bg', {
    style: 'currency',
    currency: 'BGN',
    maximumFractionDigits: 2,
  }).format(Number(product.price));

  const inStock = product.stock > 0;

  function handleAddToCart() {
    const existing = items.find((i) => i.id === product.id);
    const currentQty = existing?.quantity ?? 0;

    if (existing) {
      update(product.id, currentQty + qty);
    } else {
      add({ id: product.id, name, price: Number(product.price), imageUrl: product.imageUrl });
      if (qty > 1) update(product.id, qty);
    }

    toast({
      title: t('shop.addToCart'),
      description: qty > 1 ? `${qty}× ${name}` : name,
      variant: 'success',
    });
    setQty(1);
  }

  return (
    <div className="space-y-5">
      {/* Price */}
      <div>
        <p className="text-4xl font-bold tracking-tight text-gray-900">{price}</p>
        <p className={`mt-1.5 text-sm font-medium ${inStock ? 'text-green-600' : 'text-red-500'}`}>
          {inStock
            ? `${product.stock} ${locale === 'en' ? 'in stock' : 'в наличност'}`
            : t('shop.outOfStock')}
        </p>
      </div>

      {/* Quantity selector */}
      {inStock && (
        <div>
          <p className="mb-2 text-sm font-medium text-gray-700">{t('shop.quantity')}</p>
          <div className="inline-flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-1.5">
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              disabled={qty <= 1}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-sm transition-colors hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Minus className="h-3.5 w-3.5 text-gray-600" />
            </button>
            <span className="w-7 text-center text-base font-semibold text-gray-900">{qty}</span>
            <button
              onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
              disabled={qty >= product.stock}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-sm transition-colors hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus className="h-3.5 w-3.5 text-gray-600" />
            </button>
          </div>
        </div>
      )}

      {/* Add to cart */}
      <Button
        onClick={handleAddToCart}
        disabled={!inStock}
        size="lg"
        className="w-full rounded-2xl h-14 text-base font-semibold gap-2"
      >
        <ShoppingBag className="h-5 w-5" />
        {!inStock ? t('shop.outOfStock') : t('shop.addToCart')}
      </Button>
    </div>
  );
}
