'use client';
import { useTranslations } from 'next-intl';
import { Flower2, ShoppingBag, Leaf, BookOpen, ScanLine, User, ShieldCheck, LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { LanguageSwitcher } from './language-switcher';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useCart } from '@/hooks/use-cart';
import { cn } from '@/lib/utils/cn';
import { Link } from '@/i18n/navigation';

export function Navbar() {
  const t = useTranslations();
  const { user, logout } = useAuth();
  const { count } = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);

  const publicLinks = [
    { href: '/shop', label: t('nav.shop'), icon: ShoppingBag },
    { href: '/catalog', label: t('nav.catalog'), icon: BookOpen },
    { href: '/about', label: t('nav.about'), icon: null },
  ];

  const authLinks = user
    ? [
        { href: '/plants', label: t('nav.myPlants'), icon: Leaf },
        { href: '/scan', label: t('nav.scan'), icon: ScanLine },
        ...(user.role === 'admin' ? [{ href: '/admin', label: t('nav.admin'), icon: ShieldCheck }] : []),
      ]
    : [];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-red-100/60 bg-white/90 shadow-sm backdrop-blur-xl">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-300 to-transparent" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-18 items-center justify-between gap-4 py-2">
          <Link href="/" className="flex items-center gap-3 rounded-full bg-gradient-to-r from-red-600 to-rose-500 px-3 py-2 text-white shadow-sm transition-transform hover:-translate-y-0.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
              <Flower2 className="h-5 w-5" />
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-sm font-semibold uppercase tracking-[0.24em] text-white/80">Scarlet</span>
              <span className="text-xs text-white/70">{t('landing.heroSubtitle')}</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-2 rounded-full border border-gray-200 bg-white px-2 py-1 shadow-sm">
            {publicLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-red-50 hover:text-red-700"
              >
                {link.icon && <link.icon className="h-4 w-4" />}
                {link.label}
              </Link>
            ))}
            {authLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-red-50 hover:text-red-700"
              >
                {link.icon && <link.icon className="h-4 w-4" />}
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSwitcher className="hidden sm:flex rounded-full border border-gray-200 bg-white px-2 py-1 shadow-sm" />

            <Link href="/shop" className="relative rounded-full border border-gray-200 bg-white p-2.5 text-gray-700 shadow-sm transition-colors hover:border-red-200 hover:text-red-700">
              <ShoppingBag className="h-5 w-5" />
              {count > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                  {count > 9 ? '9+' : count}
                </span>
              )}
            </Link>

            {user ? (
              <div className="hidden md:flex items-center gap-2 rounded-full border border-gray-200 bg-white px-2 py-1 shadow-sm">
                <Link href="/profile" className="flex items-center gap-2 rounded-full px-2 py-1 text-sm text-gray-700 transition-colors hover:bg-gray-50">
                  <Avatar src={user.avatarUrl} fallback={user.name} size="sm" />
                  <span className="max-w-28 truncate">{user.name}</span>
                </Link>
                <Button variant="ghost" size="sm" onClick={() => logout()} className="rounded-full px-3">
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Button variant="outline" size="sm" asChild className="rounded-full border-gray-200 bg-white shadow-sm">
                  <Link href="/login">{t('auth.login')}</Link>
                </Button>
                <Button size="sm" asChild className="rounded-full shadow-sm">
                  <Link href="/register">{t('auth.register')}</Link>
                </Button>
              </div>
            )}

            <button
              className="md:hidden rounded-full border border-gray-200 bg-white p-2.5 text-gray-700 shadow-sm"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 shadow-lg shadow-black/5">
          <div className="mb-4 flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50 px-3 py-2">
            <span className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500">{t('common.menu')}</span>
            <LanguageSwitcher />
          </div>
          <div className="space-y-1.5">
            {[...publicLinks, ...authLinks].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-red-50 hover:text-red-700"
              >
                {link.icon && <link.icon className="h-4 w-4" />}
                {link.label}
              </Link>
            ))}
          </div>
          <div className="border-t border-gray-100 pt-4 mt-4">
            {user ? (
              <div className="flex items-center justify-between rounded-2xl bg-gray-50 px-3 py-2">
                <Link href="/profile" className="flex items-center gap-2 text-sm text-gray-700" onClick={() => setMobileOpen(false)}>
                  <Avatar src={user.avatarUrl} fallback={user.name} size="sm" />
                  <span className="max-w-48 truncate">{user.name}</span>
                </Link>
                <Button variant="ghost" size="sm" onClick={() => { setMobileOpen(false); logout(); }} className="rounded-full">
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" className="rounded-full border-gray-200" asChild>
                  <Link href="/login" onClick={() => setMobileOpen(false)}>{t('auth.login')}</Link>
                </Button>
                <Button size="sm" className="rounded-full" asChild>
                  <Link href="/register" onClick={() => setMobileOpen(false)}>{t('auth.register')}</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
