import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Flower2, ScanLine, BookOpen, ShoppingBag, ArrowRight, Sparkles } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import Image from 'next/image';

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
    { value: 'bouquet',      label: 'Букети',     image: '/images/category-bouquet.jpg' },
    { value: 'potted_plant', label: 'Саксийни',   image: '/images/category-potted-plant.jpg' },
    { value: 'succulent',    label: 'Сукуленти',  image: '/images/category-succulent.jpg' },
    { value: 'tropical',     label: 'Тропически', image: '/images/category-tropical.jpg' },
    { value: 'seasonal',     label: 'Сезонни',    image: '/images/category-seasonal.jpg' },
    { value: 'accessories',  label: 'Аксесоари',  image: '/images/category-accessories.jpg' },
  ];

  return (
    <div>
      {/* ────────────────────────────────────────────────── */}
      {/* HERO                                              */}
      {/* ────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-cream">
        {/* Full-bleed photo behind the text at every breakpoint */}
        <Image
          src="/images/hero-flowers.png"
          alt=""
          fill
          priority
          className="pointer-events-none object-cover object-center"
        />

        <div className="relative mx-auto max-w-xl px-4 py-14 text-center sm:px-6 sm:py-20 lg:py-24">
          <div className="rounded-2xl border border-white/60 bg-surface/55 px-5 py-6 shadow-lg shadow-scarlet/10 backdrop-blur-lg sm:px-8 sm:py-8">
            {/* Tag */}
            <div className="mb-5 inline-flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-scarlet" />
              <span className="text-[11px] font-bold uppercase tracking-[0.28em] text-scarlet">
                {t('landing.heroTag')}
              </span>
            </div>

            {/* Heading */}
            <h1 className="font-display text-4xl font-bold leading-[1.15] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              {t('landing.heroTitle')}
            </h1>

            {/* Sub */}
            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
              {t('landing.heroSubtitle')}
            </p>

            {/* Floral divider */}
            <div className="my-7 flex items-center justify-center gap-3">
              <div className="h-px w-14 bg-border" />
              <Flower2 className="h-4 w-4 text-scarlet opacity-60" />
              <div className="h-px w-14 bg-border" />
            </div>

            {/* CTAs */}
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                href="shop"
                className="inline-flex h-12 items-center gap-2 rounded-full bg-[linear-gradient(135deg,var(--ribbon-light)_0%,var(--ribbon)_45%,var(--ribbon-dark)_100%)] px-8 text-sm font-semibold text-white shadow-md shadow-ribbon-dark/30 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-ribbon-dark/40 hover:brightness-110"
              >
                {t('landing.heroButton')}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="register"
                className="inline-flex h-12 items-center rounded-full bg-[linear-gradient(135deg,var(--ribbon-light)_0%,var(--ribbon)_45%,var(--ribbon-dark)_100%)] px-8 text-sm font-semibold text-white shadow-md shadow-ribbon-dark/30 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-ribbon-dark/40 hover:brightness-110"
              >
                {t('landing.getStarted')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────────── */}
      {/* CATEGORY STRIP                                    */}
      {/* ────────────────────────────────────────────────── */}
      <section className="border-y border-border bg-gradient-to-b from-cream to-surface py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center sm:mb-10">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.3em] text-scarlet">
              {t('shop.tag')}
            </p>
            <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
              {t('shop.title')}
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-6">
            {shopCategories.map((cat) => (
              <Link
                key={cat.value}
                href={`/shop?category=${cat.value}`}
                className="group relative aspect-[4/5] overflow-hidden rounded-3xl border border-white/50 shadow-md shadow-ribbon-dark/10 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-ribbon-dark/20"
              >
                <Image
                  src={cat.image}
                  alt={cat.label}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-x-2.5 bottom-2.5 rounded-full bg-[linear-gradient(135deg,var(--ribbon-light)_0%,var(--ribbon)_45%,var(--ribbon-dark)_100%)] px-3 py-2.5 text-center shadow-sm">
                  <span className="text-xs font-semibold text-white sm:text-sm">
                    {cat.label}
                  </span>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-8 flex justify-center sm:mt-10">
            <Link
              href="/shop"
              className="inline-flex h-11 items-center gap-2 rounded-full bg-[linear-gradient(135deg,var(--ribbon-light)_0%,var(--ribbon)_45%,var(--ribbon-dark)_100%)] px-6 text-sm font-semibold text-white shadow-md shadow-ribbon-dark/25 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-ribbon-dark/35 hover:brightness-110"
            >
              <Flower2 className="h-4 w-4" />
              {t('shop.allCategories')}
            </Link>
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────────── */}
      {/* WHY SCARLET — Features                            */}
      {/* ────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-background py-20">
        <Image
          src="/images/why-scarlet-plant.jpg"
          alt=""
          fill
          className="pointer-events-none object-cover object-center"
        />
        <div className="pointer-events-none absolute inset-0 bg-background/90" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-14 text-center">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.3em] text-scarlet">
              {t('landing.whyUsTag')}
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
        <Image
          src="/images/category-potted-plant.jpg"
          alt=""
          fill
          className="pointer-events-none object-cover object-center"
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 65% 90% at 50% 45%, rgba(61,90,73,0.97) 0%, rgba(61,90,73,0.75) 45%, rgba(61,90,73,0.15) 100%)',
          }}
        />
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
            {t('landing.plantHealthTag')}
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
            className="inline-flex h-12 items-center gap-2 rounded-full bg-[linear-gradient(135deg,var(--ribbon-light)_0%,var(--ribbon)_45%,var(--ribbon-dark)_100%)] px-8 text-sm font-semibold text-white shadow-lg shadow-ribbon-dark/30 transition-all hover:-translate-y-0.5 hover:brightness-110"
          >
            {t('landing.getStarted')}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
