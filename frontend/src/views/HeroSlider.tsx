"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { HeroSlide } from "@/models";
import { useHeroSlider } from "@/controllers/useHeroSlider";
import { formatPromoDiscount, withPromoParam } from "@/lib/promo";

// Positioned as percentages of the card — cosmetic only.
const DOTS = [
  { size: "14px", top: "13%", left: "30%" },
  { size: "22px", top: "27%", left: "38%" },
  { size: "10px", top: "71%", left: "34%" },
];

// Fixed dark base (not derived from any banner's accentColor) paired with
// each banner's own dynamic accent gradient — same two-color system as
// before, now built around this reference's actual palette instead of a
// flat dark tone.
const INK = "#12141a";
const CREAM = "#f7f3ee";
const MUTED = "#9aa0ac";

export function HeroSlider({ slides }: { slides: HeroSlide[] }) {
  const { activeIndex, next, prev, goTo, pause, resume } = useHeroSlider(slides);

  // Phones get their own taller, stacked composition (photo full-bleed behind
  // a bottom fade, text full width at the bottom) — the desktop banner's
  // side-by-side split squeezed the copy into a ~180px column there. min-h
  // floors it from sm up: aspect-ratio alone let the card get short enough
  // that the text column's flex children overflowed up into the navbar.
  const aspectClass = "aspect-[4/5] max-h-[440px] sm:aspect-[1200/460] sm:max-h-none sm:min-h-[280px]";

  if (slides.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
        <div className={`${aspectClass} w-full animate-pulse rounded-2xl bg-border`} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
      <div
        className={`group relative ${aspectClass} isolate w-full overflow-hidden rounded-2xl shadow-[0_10px_25px_rgba(15,40,30,0.15)]`}
        onMouseEnter={pause}
        onMouseLeave={resume}
      >
        {slides.map((slide, i) => {
          const active = i === activeIndex;
          // Every slide is in the DOM at once, so only the first gets the
          // page's single <h1>; the rest are <h2> with identical styling.
          const Heading = i === 0 ? "h1" : "h2";
          // The dynamic half of the two-color system: a two-stop gradient
          // built from this banner's own accentColor (pure -> lightened),
          // standing in for the reference's fixed coral-to-amber --grad.
          const grad = `linear-gradient(120deg, ${slide.accentColor}, color-mix(in srgb, ${slide.accentColor}, white 30%))`;

          return (
            <div
              key={slide.id}
              className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                active ? "opacity-100" : "opacity-0 pointer-events-none"
              }`}
              style={{ background: INK }}
              aria-hidden={!active}
            >
              {/* Soft ambient glow, kept quiet so the CTA icon/buttons stay
                  the bold moment — this banner's accentColor at low
                  opacity, not the reference's fixed coral. */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute z-0 aspect-square w-[55%] blur-[10px]"
                style={{
                  top: "-20%",
                  left: "-10%",
                  background: `radial-gradient(circle, color-mix(in srgb, ${slide.accentColor}, transparent 78%), transparent 70%)`,
                }}
              />

              {DOTS.map((dot, dotIdx) => (
                <span
                  key={dotIdx}
                  className="absolute z-20 hidden rounded-full border border-white/[0.18] transition-transform duration-500 ease-out group-hover:translate-x-2 sm:block"
                  style={{ width: dot.size, height: dot.size, top: dot.top, left: dot.left }}
                />
              ))}

              {/* Angled photo panel — a diagonal cut (clip-path) instead
                  of a straight seam, replacing the reference's decorative
                  CSS sunset illustration with the banner's real photo. On
                  phones it fills the whole card instead, under a fade. */}
              <div className="absolute inset-0 z-10 overflow-hidden sm:left-auto sm:w-[44%] sm:[clip-path:polygon(9%_0,100%_0,100%_100%,0%_100%)]">
                <Image
                  src={slide.image}
                  alt={slide.title}
                  fill
                  priority={i === 0}
                  className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                />
              </div>

              {/* Phones only: darkens the full-bleed photo toward the bottom,
                  where the text sits, so it stays readable. */}
              <div
                aria-hidden="true"
                className="absolute inset-0 z-20 sm:hidden"
                style={{
                  background: `linear-gradient(to top, ${INK} 0%, color-mix(in srgb, ${INK}, transparent 25%) 45%, color-mix(in srgb, ${INK}, transparent 75%) 100%)`,
                }}
              />

              {/* A continuous ambient pulse (not hover-triggered) behind a
                  smaller solid icon circle — the logo's one spot on this
                  banner, replacing the reference's generic bag icon. */}
              <div
                aria-hidden="true"
                className="absolute z-30 hidden aspect-square w-[15%] rounded-full opacity-35 sm:block"
                style={{
                  left: "56%",
                  top: "50%",
                  background: grad,
                  animation: "hero-pulse-ring 2.6s ease-in-out infinite",
                }}
              />
              <div
                className="absolute z-40 hidden aspect-square w-[11%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full shadow-lg sm:flex"
                style={{ left: "56%", top: "50%", background: grad }}
              >
                <Image
                  src="/logo-icon-white.png"
                  alt=""
                  width={424}
                  height={291}
                  className="h-[46%] w-auto"
                />
              </div>

              <div className="relative z-30 flex h-full w-full flex-col justify-end gap-5 px-5 pt-14 pb-5 sm:w-[56%] sm:justify-between sm:gap-0 sm:py-[5.5%] sm:pr-[6%] sm:pb-[5%] sm:pl-[7%]">
                {/* In focus at rest; softens on hover as the photo/buttons
                    take over as the focus instead. */}
                <div className="transition-opacity duration-300 group-hover:opacity-70">
                  <span
                    className="block text-[clamp(14px,1.5vw,19px)] italic"
                    style={{ fontFamily: "var(--font-fraunces)", color: `color-mix(in srgb, ${slide.accentColor}, white 20%)` }}
                  >
                    {slide.eyebrow}
                  </span>
                  <Heading
                    className="mt-1.5 max-w-[9.5em] text-[clamp(26px,3.4vw,44px)] leading-[1.08] font-extrabold"
                    style={{ color: CREAM }}
                  >
                    {slide.title}
                  </Heading>
                  <p
                    className="mt-2.5 line-clamp-3 max-w-[30em] text-[13px] leading-relaxed sm:mt-3.5 sm:line-clamp-none sm:text-[clamp(11px,1.05vw,14px)]"
                    style={{ color: MUTED }}
                  >
                    {slide.subtitle}
                  </p>
                </div>

                <div className="transition-transform duration-300 group-hover:scale-105">
                  {slide.promo && (
                    <div className="mb-4 flex flex-wrap items-center gap-4">
                      <span
                        className="inline-flex items-center rounded-full px-3.5 py-1.5 text-xs font-bold sm:px-5 sm:py-2.5 sm:text-[clamp(11px,1.05vw,14px)] sm:shadow-[0_10px_24px_rgba(255,130,60,0.35)]"
                        style={{ background: grad, color: "#1a0f08" }}
                      >
                        {formatPromoDiscount(slide.promo)} with code {slide.promo.code}
                      </span>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-3 sm:gap-3.5">
                    <span className="hidden h-[30px] w-[2px] bg-white/25 sm:block" />
                    <Link
                      href={withPromoParam(slide.primaryCta.href, slide.promo?.code)}
                      className="rounded-full bg-[#f7f3ee] px-5 py-2.5 text-sm font-semibold text-[#12141a] sm:border-[1.5px] sm:border-white/30 sm:bg-transparent sm:px-6 sm:text-[clamp(11px,1.05vw,14px)] sm:text-[#f7f3ee]"
                    >
                      {slide.primaryCta.label}
                    </Link>
                    {slide.secondaryCta && (
                      <Link
                        href={withPromoParam(slide.secondaryCta.href, slide.promo?.code)}
                        className="text-sm font-medium text-[#f7f3ee]/85 sm:text-[clamp(11px,1.05vw,14px)] sm:font-semibold sm:text-[#f7f3ee] sm:underline sm:underline-offset-4"
                      >
                        {slide.secondaryCta.label}
                      </Link>
                    )}
                  </div>
                </div>

                <div className="hidden items-center gap-3 border-t border-white/[0.12] pt-4 transition-opacity sm:flex duration-300 group-hover:opacity-70">
                  <span className="h-[22px] w-[22px] shrink-0 rounded-full" style={{ background: grad }} />
                  <span className="text-[clamp(10px,0.95vw,13px)]" style={{ color: MUTED }}>
                    Simple shopping, happier days.
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {slides.length > 1 && (
          <>
            <div className="absolute top-4 right-4 z-40 flex gap-2 sm:top-auto sm:right-[6%] sm:bottom-[9%] sm:gap-2.5">
              <button
                onClick={prev}
                aria-label="Previous slide"
                className="flex h-[34px] w-[34px] items-center justify-center rounded-full border border-white/30 bg-black/45 text-white transition-colors hover:bg-white/20"
              >
                <ChevronLeft size={14} strokeWidth={2.4} />
              </button>
              <button
                onClick={next}
                aria-label="Next slide"
                className="flex h-[34px] w-[34px] items-center justify-center rounded-full border border-white/30 bg-black/45 text-white transition-colors hover:bg-white/20"
              >
                <ChevronRight size={14} strokeWidth={2.4} />
              </button>
            </div>

            <div className="absolute top-[30px] left-5 z-40 flex items-center gap-1.5 sm:top-auto sm:right-[5%] sm:bottom-[5%] sm:left-auto">
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
}
