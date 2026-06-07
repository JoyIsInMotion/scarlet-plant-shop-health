'use client';

import { useState, useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  Minus, Plus, Trash2, ShoppingBag, Store, ArrowRight, CheckCircle,
} from 'lucide-react';
import { useCart } from '@/hooks/use-cart';
import { useAuth } from '@/providers/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { Link, useRouter } from '@/i18n/navigation';

export default function CartPage() {
  const t = useTranslations();
  const locale = useLocale();
  const { items, remove, update, total, count, clear } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [notes, setNotes] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Prefill the contact phone from the profile (editable per order).
  useEffect(() => {
    if (user?.phone && !phone) setPhone(user.phone);
  }, [user, phone]);

  function formatPrice(amount: number) {
    return new Intl.NumberFormat(locale === 'en' ? 'en' : 'bg', {
      style: 'currency',
      currency: 'BGN',
      maximumFractionDigits: 2,
    }).format(amount);
  }

  async function handlePlaceOrder() {
    if (!user) {
      router.push('/login');
      return;
    }
    if (!phone.trim()) {
      setError(t('shop.phoneRequired'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((i) => ({ productId: i.id, quantity: i.quantity })),
          phone: phone.trim(),
          notes: notes || null,
          shippingAddress: null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? t('errors.serverError'));
        return;
      }
      clear();
      setSuccess(true);
      toast({ title: t('shop.orderPlaced'), variant: 'success' });
    } catch {
      setError(t('errors.serverError'));
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center sm:px-6">
        <div className="mb-6 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <h1 className="mb-2 text-2xl font-bold text-foreground">{t('shop.orderPlaced')}</h1>
        <p className="mb-8 text-sm text-muted">{t('shop.collectFromStoreDesc')}</p>
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/orders"
            className="inline-flex items-center gap-2 rounded-full bg-scarlet px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-scarlet-dark"
          >
            {t('orders.myOrders')}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-cream hover:text-foreground"
          >
            {t('shop.continueShopping')}
          </Link>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center sm:px-6">
        <div className="mb-6 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-cream">
            <ShoppingBag className="h-8 w-8 text-muted" />
          </div>
        </div>
        <h1 className="mb-2 text-2xl font-bold text-foreground">{t('shop.cart')}</h1>
        <p className="mb-8 text-sm text-muted">{t('shop.emptyCart')}</p>
        <Link
          href="/shop"
          className="inline-flex items-center gap-2 rounded-full bg-scarlet px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-scarlet-dark"
        >
          {t('shop.continueShopping')}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 border-b border-border pb-6">
        <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.28em] text-scarlet">
          {t('nav.shop')}
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
          {t('shop.cart')}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {count}{' '}
          {locale === 'en'
            ? count === 1 ? 'item' : 'items'
            : count === 1 ? 'артикул' : 'артикула'}
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* ── Items list ── */}
        <div className="space-y-3 lg:col-span-2">
          {items.map((item) => (
            <div key={item.id} className="flex gap-4 rounded-2xl border border-border bg-surface p-4">
              {/* Thumbnail */}
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-cream">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <ShoppingBag className="h-7 w-7 text-muted-light" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium leading-snug text-foreground">{item.name}</span>
                  <button
                    onClick={() => remove(item.id)}
                    className="shrink-0 rounded-lg p-1 text-muted transition-colors hover:bg-cream hover:text-scarlet"
                    aria-label={t('common.remove')}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex items-center justify-between gap-4">
                  {/* Quantity controls */}
                  <div className="inline-flex items-center rounded-xl border border-border">
                    <button
                      onClick={() => update(item.id, item.quantity - 1)}
                      className="flex h-8 w-8 items-center justify-center rounded-l-xl text-muted transition-colors hover:bg-cream hover:text-foreground"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-8 text-center text-sm font-semibold text-foreground">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => update(item.id, item.quantity + 1)}
                      className="flex h-8 w-8 items-center justify-center rounded-r-xl text-muted transition-colors hover:bg-cream hover:text-foreground"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Line price */}
                  <div className="text-right">
                    <p className="font-bold text-foreground">
                      {formatPrice(item.price * item.quantity)}
                    </p>
                    {item.quantity > 1 && (
                      <p className="text-xs text-muted">
                        {formatPrice(item.price)}{' '}
                        {locale === 'en' ? 'each' : 'бр.'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Order summary ── */}
        <div className="space-y-4">
          {/* Fulfillment method */}
          <div className="rounded-2xl border border-border bg-surface p-5">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-muted">
              {t('shop.fulfillmentMethod')}
            </p>
            <div className="flex items-center gap-3 rounded-xl bg-cream px-4 py-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-scarlet/10">
                <Store className="h-4 w-4 text-scarlet" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {t('shop.collectFromStore')}
                </p>
                <p className="text-xs text-muted">{t('shop.collectFromStoreDesc')}</p>
              </div>
            </div>
          </div>

          {/* Contact phone (required — we call about order details) */}
          <div className="rounded-2xl border border-border bg-surface p-5">
            <label
              htmlFor="cart-phone"
              className="mb-2 block text-[11px] font-bold uppercase tracking-[0.22em] text-muted"
            >
              {t('shop.phone')}
            </label>
            <input
              id="cart-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+359 ..."
              className="w-full rounded-xl border border-border bg-cream px-3 py-2 text-sm text-foreground placeholder:text-muted-light focus:border-scarlet focus:outline-none"
            />
            <p className="mt-2 text-xs text-muted">{t('shop.callNote')}</p>
          </div>

          {/* Notes */}
          <div className="rounded-2xl border border-border bg-surface p-5">
            <label
              htmlFor="cart-notes"
              className="mb-2 block text-[11px] font-bold uppercase tracking-[0.22em] text-muted"
            >
              {t('shop.orderNotes')}{' '}
              <span className="font-normal normal-case text-muted-light">
                ({t('common.optional')})
              </span>
            </label>
            <textarea
              id="cart-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-xl border border-border bg-cream px-3 py-2 text-sm text-foreground placeholder:text-muted-light focus:border-scarlet focus:outline-none"
            />
          </div>

          {/* Total + checkout */}
          <div className="rounded-2xl border border-border bg-surface p-5">
            <div className="mb-4 flex items-center justify-between border-b border-border pb-4">
              <span className="text-sm text-muted">{t('shop.total')}</span>
              <span className="text-2xl font-bold text-foreground">{formatPrice(total)}</span>
            </div>

            {error && (
              <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
            )}

            <button
              onClick={handlePlaceOrder}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-scarlet py-3 text-sm font-bold text-white transition-colors hover:bg-scarlet-dark disabled:opacity-60"
            >
              {loading ? (
                t('common.loading')
              ) : (
                <>
                  {user ? t('shop.checkout') : t('shop.loginToCheckout')}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            {!user && (
              <p className="mt-3 text-center text-xs text-muted">
                <Link href="/login" className="text-scarlet hover:underline">
                  {t('auth.login')}
                </Link>
                {locale === 'en' ? ' or ' : ' или '}
                <Link href="/register" className="text-scarlet hover:underline">
                  {t('auth.register')}
                </Link>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
