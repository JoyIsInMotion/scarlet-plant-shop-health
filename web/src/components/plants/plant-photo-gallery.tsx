'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Leaf, ChevronLeft, ChevronRight, Camera } from 'lucide-react';
import { HealthSummaryPanel } from './health-summary-panel';
import type { AIAnalysis, Plant } from '@scarlet/shared';

type Slide =
  | { type: 'current'; imageUrl: string; healthScore: number }
  | { type: 'analysis'; analysis: AIAnalysis };

interface PlantPhotoGalleryProps {
  plant: Pick<Plant, 'imageUrl' | 'healthScore' | 'customName'>;
  analyses: AIAnalysis[];
}

function buildSlides(plant: PlantPhotoGalleryProps['plant'], analyses: AIAnalysis[]): Slide[] {
  const slides: Slide[] = [];

  // Re-scanning the same photo creates a new analysis row each time, but the
  // image (and usually the verdict) is unchanged — show only the latest scan
  // per unique photo so the carousel doesn't repeat the same picture.
  const seenUrls = new Set<string>();
  const latestPerPhoto: AIAnalysis[] = [];
  for (const a of analyses) {
    if (a.imageUrl) {
      if (seenUrls.has(a.imageUrl)) continue;
      seenUrls.add(a.imageUrl);
    }
    latestPerPhoto.push(a);
  }

  if (plant.imageUrl && !seenUrls.has(plant.imageUrl)) {
    slides.push({ type: 'current', imageUrl: plant.imageUrl, healthScore: plant.healthScore });
  }
  latestPerPhoto.forEach((a) => slides.push({ type: 'analysis', analysis: a }));
  return slides;
}

export function PlantPhotoGallery({ plant, analyses }: PlantPhotoGalleryProps) {
  const t = useTranslations();
  const locale = useLocale();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const slides = buildSlides(plant, analyses);
  const activeSlide = slides[activeIndex] ?? null;

  const goTo = useCallback((index: number) => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({
      left: index * scrollRef.current.offsetWidth,
      behavior: 'smooth',
    });
    setActiveIndex(index);
  }, []);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollLeft, offsetWidth } = scrollRef.current;
    const index = Math.round(scrollLeft / (offsetWidth || 1));
    setActiveIndex((prev) => (index !== prev ? index : prev));
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const activeHealthScore =
    activeSlide?.type === 'analysis'
      ? (activeSlide.analysis.healthScore ?? plant.healthScore)
      : plant.healthScore;

  const activeAnalysis = activeSlide?.type === 'analysis' ? activeSlide.analysis : null;

  const activeImageUrl =
    activeSlide == null
      ? plant.imageUrl
      : activeSlide.type === 'current'
        ? activeSlide.imageUrl
        : activeSlide.analysis.imageUrl;

  return (
    <div className="rounded-xl border border-gray-200 shadow-sm overflow-hidden bg-white">
      {/* ── Carousel ── */}
      <div className="relative">
        {slides.length > 0 ? (
          <>
            <div
              ref={scrollRef}
              className="flex overflow-x-auto snap-x snap-mandatory"
              style={{ scrollbarWidth: 'none' }}
            >
              {slides.map((slide, i) => {
                const imgUrl =
                  slide.type === 'current' ? slide.imageUrl : slide.analysis.imageUrl;
                const label =
                  slide.type === 'current'
                    ? t('plants.currentPhoto')
                    : new Intl.DateTimeFormat(locale, {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      }).format(new Date(slide.analysis.analyzedAt));

                return (
                  <div key={i} className="flex-none w-full snap-start">
                    <div className="aspect-[4/3] relative bg-gray-100">
                      {imgUrl ? (
                        <img
                          src={imgUrl}
                          alt={plant.customName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Leaf className="h-12 w-12 text-gray-300" />
                        </div>
                      )}
                      <div className="absolute top-3 left-3">
                        <span className="px-2.5 py-1 text-xs font-medium bg-black/50 text-white rounded-full backdrop-blur-sm">
                          {label}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Arrow buttons ── */}
            {slides.length > 1 && activeIndex > 0 && (
              <button
                onClick={() => goTo(activeIndex - 1)}
                className="absolute left-2 top-[calc(50%-24px)] -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 shadow flex items-center justify-center hover:bg-white transition-colors z-10"
                aria-label={t('common.previous')}
              >
                <ChevronLeft className="h-4 w-4 text-gray-700" />
              </button>
            )}
            {slides.length > 1 && activeIndex < slides.length - 1 && (
              <button
                onClick={() => goTo(activeIndex + 1)}
                className="absolute right-2 top-[calc(50%-24px)] -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 shadow flex items-center justify-center hover:bg-white transition-colors z-10"
                aria-label={t('common.next')}
              >
                <ChevronRight className="h-4 w-4 text-gray-700" />
              </button>
            )}

            {/* ── Dot indicators ── */}
            {slides.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => goTo(i)}
                    className={`h-1.5 rounded-full transition-all duration-200 ${
                      i === activeIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/60'
                    }`}
                    aria-label={`Photo ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          /* ── No photos placeholder ── */
          <div className="aspect-[4/3] bg-gray-50 flex flex-col items-center justify-center gap-3">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
              <Camera className="h-8 w-8 text-gray-300" />
            </div>
            <p className="text-sm text-gray-400">{t('plants.noPhotos')}</p>
          </div>
        )}
      </div>

      {/* ── Health summary for active slide ── */}
      <div className="border-t border-gray-100">
        <HealthSummaryPanel healthScore={activeHealthScore} analysis={activeAnalysis} />
      </div>
    </div>
  );
}
