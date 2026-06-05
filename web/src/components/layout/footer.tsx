import { getTranslations } from 'next-intl/server';
import { Flower2, MapPin, Phone, Mail } from 'lucide-react';
import { Link } from '@/i18n/navigation';

export async function Footer() {
  const t = await getTranslations();

  return (
    <footer className="mt-auto border-t border-border bg-surface">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* Main grid */}
        <div className="grid grid-cols-1 gap-10 py-14 sm:grid-cols-4">

          {/* Brand — spans 2 cols */}
          <div className="sm:col-span-2">
            <Link href="/" className="mb-5 flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-scarlet shadow-sm">
                <Flower2 className="h-4 w-4 text-white" />
              </div>
              <span className="font-display text-xl font-bold tracking-tight text-foreground">Scarlet</span>
            </Link>
            <p className="max-w-xs text-sm leading-relaxed text-muted">
              {t('about.description')}
            </p>
            {/* Decorative divider */}
            <div className="mt-6 flex items-center gap-2">
              <div className="h-px w-10 bg-border" />
              <Flower2 className="h-3 w-3 text-scarlet opacity-60" />
              <div className="h-px w-6 bg-border" />
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="mb-4 text-[11px] font-bold uppercase tracking-[0.22em] text-foreground">
              {t('nav.shop')}
            </h3>
            <ul className="space-y-2.5">
              <li>
                <Link href="/shop" className="text-sm text-muted transition-colors hover:text-foreground">
                  {t('nav.shop')}
                </Link>
              </li>
              <li>
                <Link href="/catalog" className="text-sm text-muted transition-colors hover:text-foreground">
                  {t('nav.catalog')}
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-sm text-muted transition-colors hover:text-foreground">
                  {t('nav.about')}
                </Link>
              </li>
              <li>
                <Link href="/register" className="text-sm text-muted transition-colors hover:text-foreground">
                  {t('auth.register')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="mb-4 text-[11px] font-bold uppercase tracking-[0.22em] text-foreground">
              {t('about.contact')}
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2.5 text-sm text-muted">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-scarlet" />
                Popovo, Bulgaria
              </li>
              <li className="flex items-start gap-2.5 text-sm text-muted">
                <Phone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-scarlet" />
                +359 88 888 8888
              </li>
              <li className="flex items-start gap-2.5 text-sm text-muted">
                <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0 text-scarlet" />
                hello@scarlet.bg
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col items-center justify-between gap-2 border-t border-border-light py-6 text-xs text-muted sm:flex-row">
          <p>© {new Date().getFullYear()} Scarlet. {t('common.allRightsReserved')}.</p>
          <p className="flex items-center gap-1.5">
            <Flower2 className="h-3 w-3 text-scarlet opacity-60" />
            Crafted with love in Bulgaria
          </p>
        </div>
      </div>
    </footer>
  );
}
