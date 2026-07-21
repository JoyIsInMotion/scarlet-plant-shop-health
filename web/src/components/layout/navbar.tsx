'use client';
import { useTranslations } from 'next-intl';
import {
  Flower2, ShoppingBag, Leaf, ScanLine, ShieldCheck,
  LogOut, Menu, X, ChevronDown, Receipt,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { LanguageSwitcher } from './language-switcher';
import { Avatar } from '@/components/ui/avatar';
import { useCart } from '@/hooks/use-cart';
import { Link } from '@/i18n/navigation';

export function Navbar() {
  const t = useTranslations();
  const { user, logout } = useAuth();
  const { count } = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);

  const shopCategories = [
    { value: '', label: t('shop.allCategories') },
    { value: 'bouquet', label: t('shop.category.bouquet') },
    { value: 'potted_plant', label: t('shop.category.potted_plant') },
    { value: 'succulent', label: t('shop.category.succulent') },
    { value: 'tropical', label: t('shop.category.tropical') },
    { value: 'seasonal', label: t('shop.category.seasonal') },
    { value: 'accessories', label: t('shop.category.accessories') },
  ];

  const authLinks = user
    ? [
        { href: '/plants', label: t('nav.myPlants'), icon: Leaf },
        { href: '/orders', label: t('orders.myOrders'), icon: Receipt },
        { href: '/scan', label: t('nav.scan'), icon: ScanLine },
        ...(user.role === 'admin' ? [{ href: '/admin', label: t('nav.admin'), icon: ShieldCheck }] : []),
      ]
    : [];

  const navLinkClass =
    'text-[11px] font-bold uppercase tracking-[0.22em] text-muted transition-colors hover:text-foreground';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-surface shadow-[0_1px_8px_rgba(194,55,90,0.06)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-6">

          {/* ── Logo ── */}
          <Link href="/" className="flex shrink-0 items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--ribbon-light)_0%,var(--ribbon)_45%,var(--ribbon-dark)_100%)] shadow-sm shadow-ribbon-dark/30">
              <Flower2 className="h-4 w-4 text-white" strokeWidth={2.25} />
            </div>
            <span className="font-display bg-[linear-gradient(135deg,var(--ribbon-light)_0%,var(--ribbon)_45%,var(--ribbon-dark)_100%)] bg-clip-text text-xl font-bold tracking-tight text-transparent">
              Скарлет
            </span>
          </Link>

          {/* ── Desktop nav ── */}
          <nav className="hidden items-center gap-7 md:flex">
            {/* Shop dropdown */}
            <div className="group relative">
              <button
                className={`flex items-center gap-1 ${navLinkClass}`}
                onMouseEnter={() => setShopOpen(true)}
                onMouseLeave={() => setShopOpen(false)}
              >
                {t('nav.shop')}
                <ChevronDown className="h-3 w-3 transition-transform duration-200 group-hover:rotate-180" />
              </button>
              {/* Dropdown panel */}
              <div
                className="invisible absolute left-0 top-full z-50 mt-0 opacity-0 transition-all duration-150 group-hover:visible group-hover:opacity-100"
                onMouseEnter={() => setShopOpen(true)}
                onMouseLeave={() => setShopOpen(false)}
              >
                <div className="mt-2 min-w-48 overflow-hidden rounded-2xl border border-border bg-surface shadow-xl shadow-scarlet/5">
                  {shopCategories.map((cat) => (
                    <Link
                      key={cat.value}
                      href={cat.value ? `/shop?category=${cat.value}` : '/shop'}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-muted transition-colors first:pt-3 last:pb-3 hover:bg-cream hover:text-foreground"
                    >
                      {!cat.value && <Flower2 className="h-3.5 w-3.5 text-scarlet" />}
                      {cat.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            <Link href="/catalog" className={navLinkClass}>{t('nav.catalog')}</Link>
            <Link href="/scan" className={navLinkClass}>{t('nav.aiAnalyzer')}</Link>

            {authLinks.length > 0 && (
              <>
                <span className="h-3.5 w-px bg-border" />
                {authLinks.map((link) => (
                  <Link key={link.href} href={link.href} className={navLinkClass}>
                    {link.label}
                  </Link>
                ))}
              </>
            )}
          </nav>

          {/* ── Right side ── */}
          <div className="flex items-center gap-4">
            <LanguageSwitcher className="hidden sm:flex" />

            {/* Cart */}
            <Link href="/cart" className="relative text-muted transition-colors hover:text-scarlet">
              <ShoppingBag className="h-5 w-5" />
              {count > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-scarlet px-0.5 text-[9px] font-bold text-white">
                  {count > 9 ? '9+' : count}
                </span>
              )}
            </Link>

            {/* Auth */}
            {user ? (
              <div className="hidden items-center gap-1 md:flex">
                <Link
                  href="/profile"
                  className="flex items-center gap-2 rounded-xl px-2 py-1.5 transition-colors hover:bg-cream"
                >
                  <Avatar src={user.avatarUrl} fallback={user.name} size="sm" />
                  <span className="max-w-24 truncate text-xs font-medium text-foreground">{user.name}</span>
                </Link>
                <button
                  onClick={() => logout()}
                  className="rounded-xl p-1.5 text-muted transition-colors hover:bg-cream hover:text-foreground"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="hidden items-center gap-2 md:flex">
                <Link href="/login" className={navLinkClass}>
                  {t('auth.login')}
                </Link>
                <Link
                  href="/register"
                  className="rounded-full bg-[linear-gradient(135deg,var(--ribbon-light)_0%,var(--ribbon)_45%,var(--ribbon-dark)_100%)] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.15em] text-white transition-all hover:brightness-110"
                >
                  {t('auth.register')}
                </Link>
              </div>
            )}

            {/* Mobile burger */}
            <button
              className="rounded-xl p-2 text-muted transition-colors hover:bg-cream hover:text-foreground md:hidden"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile menu ── */}
      {mobileOpen && (
        <div className="border-t border-border bg-surface px-4 pb-6 pt-4 md:hidden">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted">
              {t('common.menu')}
            </span>
            <LanguageSwitcher />
          </div>

          {/* Shop categories */}
          <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.25em] text-muted-light">
            {t('nav.shop')}
          </p>
          <div className="mb-3 space-y-0.5">
            {shopCategories.map((cat) => (
              <Link
                key={cat.value}
                href={cat.value ? `/shop?category=${cat.value}` : '/shop'}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted transition-colors hover:bg-cream hover:text-foreground"
              >
                {cat.label}
              </Link>
            ))}
          </div>

          <div className="mb-3 space-y-0.5">
            <Link href="/catalog" onClick={() => setMobileOpen(false)} className="block rounded-xl px-3 py-2 text-sm text-muted transition-colors hover:bg-cream hover:text-foreground">
              {t('nav.catalog')}
            </Link>
            <Link href="/scan" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted transition-colors hover:bg-cream hover:text-foreground">
              <ScanLine className="h-4 w-4" />
              {t('nav.aiAnalyzer')}
            </Link>
          </div>

          {authLinks.length > 0 && (
            <div className="mb-3 space-y-0.5 border-t border-border pt-3">
              {authLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted transition-colors hover:bg-cream hover:text-foreground"
                >
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </Link>
              ))}
            </div>
          )}

          <div className="border-t border-border pt-4">
            {user ? (
              <div className="flex items-center justify-between rounded-xl bg-cream px-3 py-2">
                <Link href="/profile" onClick={() => setMobileOpen(false)} className="flex items-center gap-2">
                  <Avatar src={user.avatarUrl} fallback={user.name} size="sm" />
                  <span className="max-w-48 truncate text-sm font-medium text-foreground">{user.name}</span>
                </Link>
                <button
                  onClick={() => { setMobileOpen(false); logout(); }}
                  className="rounded-xl p-1.5 text-muted transition-colors hover:text-foreground"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="flex h-10 items-center justify-center rounded-xl border border-border text-sm font-medium text-foreground transition-colors hover:bg-cream"
                >
                  {t('auth.login')}
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileOpen(false)}
                  className="flex h-10 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--ribbon-light)_0%,var(--ribbon)_45%,var(--ribbon-dark)_100%)] text-sm font-medium text-white transition-all hover:brightness-110"
                >
                  {t('auth.register')}
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
