import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { AuthProvider } from '@/providers/auth-provider';
import { CartProvider } from '@/providers/cart-provider';
import { ToastProvider } from '@/providers/toast-provider';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';

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

  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <AuthProvider>
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
