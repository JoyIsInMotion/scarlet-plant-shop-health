import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { MapPin, Phone, Mail, Clock, Flower2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('about');
  return { title: t('title') };
}

export default function AboutPage() {
  const t = useTranslations();

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      {/* Hero */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-red-50 mb-4">
          <Flower2 className="h-8 w-8 text-red-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">{t('about.title')}</h1>
        <p className="mt-2 text-lg text-gray-500">{t('about.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Story */}
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">{t('about.mission')}</h2>
            <p className="text-gray-600 leading-relaxed">{t('about.description')}</p>
            <p className="mt-3 text-gray-600 leading-relaxed">{t('about.missionText')}</p>
          </div>
        </div>

        {/* Contact */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">{t('about.contact')}</h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3 text-sm">
                <MapPin className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-700">{t('about.address')}</p>
                  <p className="text-gray-500">{t('about.addressValue')}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <Phone className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-700">{t('about.phone')}</p>
                  <p className="text-gray-500">+359 88 888 8888</p>
                </div>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <Mail className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-700">{t('about.email')}</p>
                  <p className="text-gray-500">hello@scarlet.bg</p>
                </div>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <Clock className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-700">{t('about.hours')}</p>
                  <p className="text-gray-500">{t('about.hoursWeekdays')}</p>
                  <p className="text-gray-500">{t('about.hoursSunday')}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
