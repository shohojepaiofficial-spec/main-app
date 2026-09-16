"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { HeroSlide } from "@/models";
import { useHeroSlider } from "@/controllers/useHeroSlider";
import { formatPromoDiscount, withPromoParam } from "@/lib/promo";

export function HeroSlider({ slides }: { slides: HeroSlide[] }) {
  const { activeIndex, next, prev, goTo, pause, resume } = useHeroSlider(slides);

  const heightClasses = "h-[calc(100vh-var(--navbar-height))] min-h-[460px] max-h-[820px]";

  if (slides.length === 0) {
    return <div className={`${heightClasses} w-full bg-border animate-pulse`} />;
  }

  return (
    <div
      className={`relative ${heightClasses} w-full overflow-hidden bg-foreground`}
      onMouseEnter={pause}
      onMouseLeave={resume}
    >
      {slides.map((slide, i) => (
        <div
          key={slide.id}
          className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
            i === activeIndex ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
          aria-hidden={i !== activeIndex}
        >
          <Image
            src={slide.image}
            alt={slide.title}
            fill
            priority={i === 0}
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />

          <div className="relative z-10 flex h-full flex-col justify-end gap-4 px-6 pb-16 md:px-16 md:pb-20 max-w-2xl">
            <span
              className="w-fit rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wide text-white"
              style={{ backgroundColor: slide.accentColor }}
            >
              {slide.eyebrow}
            </span>
            <h1 className="text-3xl md:text-5xl font-semibold text-white leading-tight">
              {slide.title}
            </h1>
            <p className="text-sm md:text-base text-white/90 max-w-md">{slide.subtitle}</p>
            {slide.promo && (
              <p className="w-fit rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
                {formatPromoDiscount(slide.promo)} with code {slide.promo.code}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href={withPromoParam(slide.primaryCta.href, slide.promo?.code)}
                className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
              >
                {slide.primaryCta.label}
              </Link>
              {slide.secondaryCta && (
                <Link
                  href={withPromoParam(slide.secondaryCta.href, slide.promo?.code)}
                  className="rounded-md border border-white/70 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/10"
                >
                  {slide.secondaryCta.label}
                </Link>
              )}
            </div>
          </div>
        </div>
      ))}

      {slides.length > 1 && (
        <>
          <button
            onClick={prev}
            aria-label="Previous slide"
            className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/20 p-2 text-white backdrop-blur-sm hover:bg-white/30"
          >
            <ChevronLeft size={22} />
          </button>
          <button
            onClick={next}
            aria-label="Next slide"
            className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/20 p-2 text-white backdrop-blur-sm hover:bg-white/30"
          >
            <ChevronRight size={22} />
          </button>

          <div className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 gap-2">
            {slides.map((slide, i) => (
              <button
                key={slide.id}
                onClick={() => goTo(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={`h-2 rounded-full transition-all ${
                  i === activeIndex ? "w-6 bg-white" : "w-2 bg-white/50 hover:bg-white/70"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
