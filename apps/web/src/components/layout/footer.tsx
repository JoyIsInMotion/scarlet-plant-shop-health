import { getTranslations } from 'next-intl/server';
import { Flower2 } from 'lucide-react';
import { Link } from '@/i18n/navigation';

export async function Footer() {
  const t = await getTranslations();

  return (
    <footer className="mt-auto border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          <div>
            <Link href="/" className="flex items-center gap-2 font-bold text-red-600 text-lg">
              <Flower2 className="h-5 w-5" />
              <span>Scarlet</span>
            </Link>
            <p className="mt-2 text-sm text-gray-500 max-w-xs">
              {t('about.description')}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900">{t('nav.shop')}</h3>
            <ul className="mt-3 space-y-2">
              <li><Link href="/shop" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">{t('nav.shop')}</Link></li>
              <li><Link href="/catalog" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">{t('nav.catalog')}</Link></li>
              <li><Link href="/about" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">{t('nav.about')}</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900">{t('about.contact')}</h3>
            <ul className="mt-3 space-y-2 text-sm text-gray-500">
              <li>Popovo, Bulgaria</li>
              <li>+359 88 888 8888</li>
              <li>hello@scarlet.bg</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-gray-100 pt-6 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} Scarlet. {t('common.allRightsReserved')}.
        </div>
      </div>
    </footer>
  );
}
