"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { HeroSlide } from "@/models";
import { useHeroSlider } from "@/controllers/useHeroSlider";
import { formatPromoDiscount, withPromoParam } from "@/lib/promo";

export function HeroSlider({ slides }: { slides: HeroSlide[] }) {
  const { activeIndex, next, prev, goTo, pause, resume } = useHeroSlider(slides);

  const heightClasses = "h-[420px] md:h-[440px]";

  if (slides.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
        <div className={`${heightClasses} w-full rounded-2xl bg-border animate-pulse`} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
      <div
        className={`relative ${heightClasses} w-full overflow-hidden rounded-2xl border border-border shadow-sm`}
        onMouseEnter={pause}
        onMouseLeave={resume}
      >
        {slides.map((slide, i) => {
          const active = i === activeIndex;
          return (
            <div
              key={slide.id}
              className={`absolute inset-0 flex flex-col md:flex-row transition-opacity duration-700 ease-in-out ${
                active ? "opacity-100" : "opacity-0 pointer-events-none"
              }`}
              aria-hidden={!active}
            >
              {/* A solid-color panel beside the photo, not text floating on
                  top of it — a boxed overlay is the exact "dull, templatey"
                  look this replaced, so the text needs its own real estate
                  instead of another translucent box over the image. The
                  logo lives only in the seam badge below now (not also as a
                  watermark here) — one intentional placement beats two
                  competing ones. */}
              <div
                className="relative order-2 z-0 flex h-[44%] w-full flex-col justify-center gap-2.5 px-6 py-5 md:order-1 md:h-full md:w-[38%] md:px-9 md:py-8"
                style={{
                  background: `linear-gradient(155deg, ${slide.accentColor}, color-mix(in srgb, ${slide.accentColor}, black 35%))`,
                }}
              >
                <span className="relative w-fit rounded-full bg-white/20 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-white">
                  {slide.eyebrow}
                </span>
                <h1 className="relative text-xl leading-tight font-semibold text-white sm:text-2xl md:text-3xl">
                  {slide.title}
                </h1>
                <p className="relative hidden text-sm text-white/85 sm:block">{slide.subtitle}</p>
                {slide.promo && (
                  <p className="relative w-fit rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white">
                    {formatPromoDiscount(slide.promo)} with code {slide.promo.code}
                  </p>
                )}
                <div className="relative flex flex-wrap items-center gap-3 pt-1">
                  <Link
                    href={withPromoParam(slide.primaryCta.href, slide.promo?.code)}
                    className="rounded-md bg-white px-4 py-2 text-sm font-medium hover:bg-white/90"
                    style={{ color: slide.accentColor }}
                  >
                    {slide.primaryCta.label}
                  </Link>
                  {slide.secondaryCta && (
                    <Link
                      href={withPromoParam(slide.secondaryCta.href, slide.promo?.code)}
                      className="rounded-md border border-white/70 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
                    >
                      {slide.secondaryCta.label}
                    </Link>
                  )}
                </div>
                <p className="relative pt-1 text-xs italic text-white/60">
                  Simple shopping, happier days.
                </p>
              </div>

              {/* The "arch": a curved divider bulging from the panel/photo
                  seam into the photo, blending the site's own green with
                  this banner's own accent color — replaces the flat panel
                  fill's dead corner with an actual shape instead of a
                  second static color block. Starts exactly at the panel's
                  own right edge (md:w-[38%] above), so it never has to
                  fight the panel's text for stacking — only the photo's
                  left edge, which it's meant to sit on top of. */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 left-[38%] z-10 hidden w-24 rounded-r-full md:block lg:w-28"
                style={{
                  background: `linear-gradient(160deg, #15914f, ${slide.accentColor})`,
                }}
              />

              {/* The logo's one placement on this banner — a shaded badge
                  (radial-gradient in the banner's own accent color, same
                  "glossy" treatment the reference's discount badge used)
                  straddling the seam, in place of a discount-percentage
                  callout this store doesn't run. */}
              <div
                className="absolute left-[38%] top-1/2 z-20 hidden h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full shadow-lg ring-4 ring-white md:flex lg:h-24 lg:w-24"
                style={{
                  background: `radial-gradient(circle at 35% 30%, color-mix(in srgb, ${slide.accentColor}, white 25%), ${slide.accentColor} 65%, color-mix(in srgb, ${slide.accentColor}, black 30%) 100%)`,
                }}
              >
                <Image
                  src="/logo-icon-white.png"
                  alt=""
                  width={424}
                  height={291}
                  className="h-8 w-auto lg:h-10"
                />
              </div>

              <div className="relative order-1 z-0 h-[56%] w-full md:order-2 md:h-full md:flex-1">
                <Image
                  src={slide.image}
                  alt={slide.title}
                  fill
                  priority={i === 0}
                  className="object-cover"
                />

                {slides.length > 1 && (
                  <>
                    <button
                      onClick={prev}
                      aria-label="Previous slide"
                      className="absolute left-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/25 p-2 text-white backdrop-blur-sm hover:bg-white/40"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <button
                      onClick={next}
                      aria-label="Next slide"
                      className="absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/25 p-2 text-white backdrop-blur-sm hover:bg-white/40"
                    >
                      <ChevronRight size={20} />
                    </button>

                    <div className="absolute bottom-3 right-3 z-20 flex gap-1.5">
                      {slides.map((s, dotIndex) => (
                        <button
                          key={s.id}
                          onClick={() => goTo(dotIndex)}
                          aria-label={`Go to slide ${dotIndex + 1}`}
                          className={`h-1.5 rounded-full transition-all ${
                            dotIndex === activeIndex ? "w-5 bg-white" : "w-1.5 bg-white/50 hover:bg-white/70"
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
