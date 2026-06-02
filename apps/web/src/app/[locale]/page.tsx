import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Flower2, ScanLine, BookOpen, ShoppingBag, ArrowRight, Sparkles } from 'lucide-react';
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
    { icon: ScanLine,    title: t('landing.feature1Title'), desc: t('landing.feature1Desc') },
    { icon: BookOpen,    title: t('landing.feature2Title'), desc: t('landing.feature2Desc') },
    { icon: ShoppingBag, title: t('landing.feature3Title'), desc: t('landing.feature3Desc') },
  ];

  const shopCategories = [
    { value: 'bouquet',      label: 'Букети' },
    { value: 'potted_plant', label: 'Саксийни' },
    { value: 'succulent',    label: 'Сукуленти' },
    { value: 'tropical',     label: 'Тропически' },
    { value: 'seasonal',     label: 'Сезонни' },
    { value: 'accessories',  label: 'Аксесоари' },
  ];

  return (
    <div>
      {/* ────────────────────────────────────────────────── */}
      {/* HERO                                              */}
      {/* ────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-cream py-24 sm:py-32">
        {/* Large faded floral decorations */}
        <Flower2
          className="pointer-events-none absolute -right-16 -top-10 h-80 w-80 text-scarlet opacity-[0.07]"
          strokeWidth={0.6}
        />
        <Flower2
          className="pointer-events-none absolute -left-20 bottom-0 h-64 w-64 text-botanical opacity-[0.06]"
          strokeWidth={0.6}
        />
        <Flower2
          className="pointer-events-none absolute right-1/3 bottom-4 h-24 w-24 text-rose opacity-[0.12]"
          strokeWidth={0.8}
        />

        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
          {/* Tag */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-1.5 shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-scarlet" />
            <span className="text-[11px] font-bold uppercase tracking-[0.28em] text-scarlet">
              Scarlet Boutique
            </span>
          </div>

          {/* Heading */}
          <h1 className="font-display text-5xl font-bold leading-[1.15] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
            {t('landing.heroTitle')}
          </h1>

          {/* Sub */}
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
            {t('landing.heroSubtitle')}
          </p>

          {/* Floral divider */}
          <div className="my-8 flex items-center justify-center gap-3">
            <div className="h-px w-14 bg-border" />
            <Flower2 className="h-4 w-4 text-scarlet opacity-60" />
            <div className="h-px w-14 bg-border" />
          </div>

          {/* CTAs */}
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="shop"
              className="inline-flex h-12 items-center gap-2 rounded-full bg-scarlet px-8 text-sm font-semibold text-white shadow-md shadow-scarlet/20 transition-all hover:-translate-y-0.5 hover:bg-scarlet-dark hover:shadow-lg hover:shadow-scarlet/25"
            >
              {t('landing.heroButton')}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="register"
              className="inline-flex h-12 items-center rounded-full border border-border bg-surface px-8 text-sm font-semibold text-foreground transition-all hover:-translate-y-0.5 hover:border-scarlet/30 hover:bg-cream hover:shadow-sm"
            >
              {t('landing.getStarted')}
            </Link>
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────────── */}
      {/* CATEGORY STRIP                                    */}
      {/* ────────────────────────────────────────────────── */}
      <section className="border-y border-border bg-surface py-5">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-3">
            {shopCategories.map((cat) => (
              <Link
                key={cat.value}
                href={`/shop?category=${cat.value}`}
                className="rounded-full border border-border bg-background px-5 py-2 text-xs font-semibold text-muted transition-all hover:border-scarlet/40 hover:bg-cream hover:text-scarlet"
              >
                {cat.label}
              </Link>
            ))}
            <Link
              href="/shop"
              className="rounded-full bg-scarlet px-5 py-2 text-xs font-semibold text-white transition-all hover:bg-scarlet-dark"
            >
              {t('shop.allCategories')}
            </Link>
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────────── */}
      {/* WHY SCARLET — Features                            */}
      {/* ────────────────────────────────────────────────── */}
      <section className="bg-background py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-14 text-center">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.3em] text-scarlet">
              {t('landing.whyUs')}
            </p>
            <h2 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
              {t('landing.whyUs')}
            </h2>
            <div className="mx-auto mt-4 flex items-center justify-center gap-3">
              <div className="h-px w-10 bg-border" />
              <Flower2 className="h-3.5 w-3.5 text-border" />
              <div className="h-px w-10 bg-border" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="group flex flex-col rounded-2xl border border-border-light bg-surface p-8 transition-all hover:border-border hover:shadow-lg hover:shadow-scarlet/5"
              >
                <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-scarlet-light shadow-sm ring-1 ring-border">
                  <f.icon className="h-5 w-5 text-scarlet" />
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground mb-2">{f.title}</h3>
                <p className="text-sm leading-relaxed text-muted">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────────── */}
      {/* PLANT HEALTH CTA                                  */}
      {/* ────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-botanical-dark py-20">
        <Flower2
          className="pointer-events-none absolute right-8 top-1/2 h-56 w-56 -translate-y-1/2 text-white opacity-[0.04]"
          strokeWidth={0.6}
        />
        <Flower2
          className="pointer-events-none absolute left-8 top-1/2 h-32 w-32 -translate-y-1/2 text-white opacity-[0.03]"
          strokeWidth={0.6}
        />
        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
          <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.3em] text-botanical-light">
            Plant Health
          </p>
          <h2 className="font-display text-3xl font-bold text-white sm:text-4xl mb-5">
            {t('landing.plantHealthCTA')}
          </h2>

          <div className="mx-auto mb-8 flex items-center justify-center gap-3">
            <div className="h-px w-10 bg-botanical/60" />
            <Flower2 className="h-3.5 w-3.5 text-botanical-light opacity-60" />
            <div className="h-px w-10 bg-botanical/60" />
          </div>

          <p className="mx-auto mb-8 max-w-lg text-base leading-relaxed text-botanical-light">
            {t('landing.plantHealthDesc')}
          </p>
          <Link
            href="scan"
            className="inline-flex h-12 items-center gap-2 rounded-full bg-surface px-8 text-sm font-semibold text-botanical-dark shadow-lg transition-all hover:-translate-y-0.5 hover:bg-botanical-light"
          >
            {t('landing.getStarted')}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
