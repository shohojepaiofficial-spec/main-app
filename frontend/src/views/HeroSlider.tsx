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
                  instead of another translucent box over the image. */}
              <div
                className="relative order-2 flex h-[44%] w-full flex-col justify-center gap-2.5 overflow-hidden px-6 py-5 md:order-1 md:h-full md:w-[38%] md:px-9 md:py-8"
                style={{
                  background: `linear-gradient(155deg, ${slide.accentColor}, color-mix(in srgb, ${slide.accentColor}, black 35%))`,
                }}
              >
                {/* Same brand mark as the navbar logo (a white silhouette
                    cut from public/logo-icon.png — see Logo.tsx), blown up
                    and near-invisible — light brand texture instead of a
                    flat, generic color fill. */}
                <Image
                  src="/logo-icon-white.png"
                  alt=""
                  width={424}
                  height={291}
                  aria-hidden="true"
                  className="pointer-events-none absolute -bottom-10 -right-10 h-36 w-auto rotate-[-8deg] opacity-10 md:h-44"
                />

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
              </div>

              <div className="relative order-1 h-[56%] w-full md:order-2 md:h-full md:flex-1">
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
