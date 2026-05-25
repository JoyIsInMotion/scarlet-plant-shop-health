'use client';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Flower2, ShoppingBag, Leaf, BookOpen, ScanLine, LayoutDashboard, User, ShieldCheck, LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { LanguageSwitcher } from './language-switcher';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useCart } from '@/hooks/use-cart';
import { cn } from '@/lib/utils/cn';

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
        { href: '/dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
        { href: '/plants', label: t('nav.myPlants'), icon: Leaf },
        { href: '/scan', label: t('nav.scan'), icon: ScanLine },
        ...(user.role === 'admin' ? [{ href: '/admin', label: t('nav.admin'), icon: ShieldCheck }] : []),
      ]
    : [];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold text-red-600 text-xl">
            <Flower2 className="h-6 w-6" />
            <span>Scarlet</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {publicLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
              >
                {link.icon && <link.icon className="h-4 w-4" />}
                {link.label}
              </Link>
            ))}
            {authLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
              >
                {link.icon && <link.icon className="h-4 w-4" />}
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <LanguageSwitcher className="hidden sm:flex" />

            {/* Cart */}
            <Link href="/shop" className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors">
              <ShoppingBag className="h-5 w-5" />
              {count > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">
                  {count > 9 ? '9+' : count}
                </span>
              )}
            </Link>

            {/* Auth */}
            {user ? (
              <div className="hidden md:flex items-center gap-2">
                <Link href="/profile" className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900 transition-colors">
                  <Avatar src={user.avatarUrl} fallback={user.name} size="sm" />
                </Link>
                <Button variant="ghost" size="sm" onClick={() => logout()}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/login">{t('auth.login')}</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link href="/register">{t('auth.register')}</Link>
                </Button>
              </div>
            )}

            {/* Mobile menu toggle */}
            <button
              className="md:hidden p-2 text-gray-600 hover:text-gray-900"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1">
          <LanguageSwitcher className="mb-3" />
          {[...publicLinks, ...authLinks].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
            >
              {link.icon && <link.icon className="h-4 w-4" />}
              {link.label}
            </Link>
          ))}
          <div className="border-t border-gray-100 pt-3 mt-3">
            {user ? (
              <div className="flex items-center justify-between">
                <Link href="/profile" className="flex items-center gap-2 text-sm text-gray-700" onClick={() => setMobileOpen(false)}>
                  <Avatar src={user.avatarUrl} fallback={user.name} size="sm" />
                  <span>{user.name}</span>
                </Link>
                <Button variant="ghost" size="sm" onClick={() => { setMobileOpen(false); logout(); }}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" asChild>
                  <Link href="/login" onClick={() => setMobileOpen(false)}>{t('auth.login')}</Link>
                </Button>
                <Button size="sm" className="flex-1" asChild>
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
