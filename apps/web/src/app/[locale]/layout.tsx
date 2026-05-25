import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { AuthProvider } from '@/providers/auth-provider';
import { CartProvider } from '@/providers/cart-provider';
import { ToastProvider } from '@/providers/toast-provider';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { getAccessToken } from '@/lib/auth/cookies';
import { verifyAccessToken } from '@/lib/auth/jwt';
import * as usersService from '@/services/users.service';
import type { User } from '@scarlet/shared';

async function getInitialUser(): Promise<User | null> {
  try {
    const token = await getAccessToken();
    if (!token) return null;
    const payload = verifyAccessToken(token);
    return (await usersService.getMe(payload.sub)) as unknown as User;
  } catch {
    return null;
  }
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as 'bg' | 'en')) {
    notFound();
  }

  const [messages, initialUser] = await Promise.all([getMessages(), getInitialUser()]);

  return (
    <NextIntlClientProvider messages={messages}>
      <AuthProvider initialUser={initialUser}>
        <CartProvider>
          <ToastProvider>
            <Navbar />
            <main className="flex-1 min-h-[calc(100vh-4rem-16rem)] flex flex-col">{children}</main>
            <Footer />
          </ToastProvider>
        </CartProvider>
      </AuthProvider>
    </NextIntlClientProvider>
  );
}
