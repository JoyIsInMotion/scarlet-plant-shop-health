import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Flower2, ScanLine, BookOpen, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('landing');
  return { title: t('heroTitle') };
}

export default function HomePage() {
  return <LandingContent />;
}

function LandingContent() {
  const t = useTranslations();

  const features = [
    {
      icon: ScanLine,
      title: t('landing.feature1Title'),
      desc: t('landing.feature1Desc'),
      color: 'bg-green-50 text-green-600',
    },
    {
      icon: BookOpen,
      title: t('landing.feature2Title'),
      desc: t('landing.feature2Desc'),
      color: 'bg-blue-50 text-blue-600',
    },
    {
      icon: ShoppingBag,
      title: t('landing.feature3Title'),
      desc: t('landing.feature3Desc'),
      color: 'bg-red-50 text-red-600',
    },
  ];

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-red-50 via-white to-green-50 py-20 sm:py-28">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-red-100 px-4 py-2 text-sm font-medium text-red-700 mb-6">
            <Flower2 className="h-4 w-4" />
            Scarlet Boutique
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            {t('landing.heroTitle')}
          </h1>
          <p className="mt-6 text-lg text-gray-600 max-w-2xl mx-auto">
            {t('landing.heroSubtitle')}
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link href="shop">{t('landing.heroButton')}</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="register">{t('landing.getStarted')}</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-12">{t('landing.whyUs')}</h2>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className={`inline-flex rounded-lg p-3 mb-4 ${f.color}`}>
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Plant health CTA */}
      <section className="py-16 bg-gradient-to-r from-green-600 to-green-700">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <h2 className="text-2xl font-bold text-white mb-4">{t('landing.plantHealthCTA')}</h2>
          <p className="text-green-100 mb-8">{t('landing.plantHealthDesc')}</p>
          <Button size="lg" variant="secondary" asChild>
            <Link href="scan">{t('landing.getStarted')}</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
