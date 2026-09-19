"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { HeroSlide } from "@/models";
import { useHeroSlider } from "@/controllers/useHeroSlider";
import { withPromoParam } from "@/lib/promo";
import { formatCurrency } from "@/lib/currency";
import { Logo } from "@/views/Logo";

// Decorative dots + side line, positioned in the same 1024x585 coordinate
// space as the arch's own SVG viewBox below (as percentages, so they track
// it exactly) — cosmetic only, matches the user-supplied reference.
const DOTS = [
  { size: "1.6%", top: "9%", left: "34%" },
  { size: "2.6%", top: "22%", left: "41%" },
  { size: "1.2%", top: "40%", left: "39%" },
  { size: "3%", top: "62%", left: "36%" },
];

// The badge shows this banner's actual offer when it has one (in place of
// the reference's hardcoded "75% DISCOUNT"), falling back to the logo mark
// for a banner with no linked promo.
function badgeOffer(slide: HeroSlide): { big: string; small: string } | null {
  if (!slide.promo) return null;
  return slide.promo.discountType === "percentage"
    ? { big: `${slide.promo.value}%`, small: "OFF" }
    : { big: formatCurrency(slide.promo.value), small: "OFF" };
}

export function HeroSlider({ slides }: { slides: HeroSlide[] }) {
  const { activeIndex, next, prev, goTo, pause, resume } = useHeroSlider(slides);

  if (slides.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
        <div className="aspect-[1024/585] w-full animate-pulse rounded-2xl bg-border" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
      <div
        className="relative aspect-[1024/585] w-full overflow-hidden rounded-2xl bg-white shadow-[0_35px_70px_rgba(15,40,30,0.35)]"
        onMouseEnter={pause}
        onMouseLeave={resume}
      >
        {slides.map((slide, i) => {
          const active = i === activeIndex;
          const offer = badgeOffer(slide);
          // Every color on the banner derives from this one admin-picked
          // accentColor — a pale tint for the arch's glow tips, and a
          // darkened shade standing in for the reference's fixed --dark for
          // every solid UI element (badge, button, icon, stub line).
          const paleAccent = `color-mix(in srgb, ${slide.accentColor}, white 78%)`;
          const darkAccent = `color-mix(in srgb, ${slide.accentColor}, black 45%)`;

          return (
            <div
              key={slide.id}
              className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                active ? "opacity-100" : "opacity-0 pointer-events-none"
              }`}
              aria-hidden={!active}
            >
              {DOTS.map((dot, dotIdx) => (
                <span
                  key={dotIdx}
                  className="absolute z-20 hidden aspect-square rounded-full border border-border sm:block"
                  style={{ width: dot.size, top: dot.top, left: dot.left }}
                />
              ))}
              <span
                className="absolute z-20 hidden w-[2px] sm:block"
                style={{ left: "2.5%", top: "62%", bottom: "8%", background: darkAccent }}
              />

              {/* The arch: a single circle (same technique as the reference
                  — an SVG circle whose right half is simply painted over by
                  the photo layer below, rather than any clipping math),
                  glowing pale-to-vivid-to-pale top-to-bottom in this
                  banner's own accent color. */}
              <svg
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 z-0 h-full w-full"
                viewBox="0 0 1024 585"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id={`arch-${slide.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={paleAccent} />
                    <stop offset="18%" stopColor={slide.accentColor} />
                    <stop offset="50%" stopColor={slide.accentColor} />
                    <stop offset="82%" stopColor={slide.accentColor} />
                    <stop offset="100%" stopColor={paleAccent} />
                  </linearGradient>
                </defs>
                <circle cx="614" cy="292.5" r="255" fill={`url(#arch-${slide.id})`} />
              </svg>

              <div className="absolute inset-y-0 right-0 z-10" style={{ left: "60%" }}>
                <Image
                  src={slide.image}
                  alt={slide.title}
                  fill
                  priority={i === 0}
                  className="object-cover"
                />
              </div>

              {/* Sits on the arch's peak, same spot the reference's
                  "75% DISCOUNT" circle occupied — shows this banner's real
                  offer instead, or the logo mark when it doesn't have one. */}
              <div
                className="absolute z-20 flex aspect-square w-[14%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border-[6px] border-white text-center text-white shadow-lg"
                style={{ left: "60%", top: "50%", background: darkAccent }}
              >
                {offer ? (
                  <>
                    <span className="text-[clamp(16px,2.2vw,27px)] leading-tight font-extrabold">
                      {offer.big}
                    </span>
                    <span className="text-[clamp(8px,0.9vw,11px)] font-semibold tracking-wide">
                      {offer.small}
                    </span>
                  </>
                ) : (
                  <Image
                    src="/logo-icon-white.png"
                    alt=""
                    width={424}
                    height={291}
                    className="h-[40%] w-auto"
                  />
                )}
              </div>

              <div className="relative z-30 flex h-full w-[56%] flex-col justify-between py-[6%] pr-0 pl-[8%]">
                <Logo showWordmark={false} />

                <div className="max-w-[88%]">
                  <span
                    className="block text-[clamp(18px,3vw,32px)] text-muted italic"
                    style={{ fontFamily: "var(--font-playfair)" }}
                  >
                    {slide.eyebrow}
                  </span>
                  <h1 className="mt-0.5 block text-[clamp(28px,5vw,50px)] leading-none font-extrabold text-foreground">
                    {slide.title}
                  </h1>
                  <p className="mt-3.5 max-w-[260px] text-[clamp(10px,1.1vw,13px)] leading-relaxed text-muted">
                    {slide.subtitle}
                  </p>
                  <div className="mt-5 flex flex-wrap items-center gap-3.5">
                    <span className="hidden h-8 w-[2px] sm:block" style={{ background: darkAccent }} />
                    <Link
                      href={withPromoParam(slide.primaryCta.href, slide.promo?.code)}
                      className="rounded-full px-7 py-3 text-[clamp(11px,1.2vw,14px)] font-semibold text-white"
                      style={{ background: darkAccent }}
                    >
                      {slide.primaryCta.label}
                    </Link>
                    {slide.secondaryCta && (
                      <Link
                        href={withPromoParam(slide.secondaryCta.href, slide.promo?.code)}
                        className="text-[clamp(11px,1.2vw,14px)] font-semibold text-foreground underline underline-offset-4"
                      >
                        {slide.secondaryCta.label}
                      </Link>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 border-t border-border pt-3.5 text-[clamp(9px,1vw,13px)] font-medium text-foreground">
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white"
                    style={{ background: darkAccent }}
                  >
                    <Sparkles size={12} />
                  </span>
                  Simple shopping, happier days.
                </div>
              </div>
            </div>
          );
        })}

        {slides.length > 1 && (
          <>
            <button
              onClick={prev}
              aria-label="Previous slide"
              className="absolute top-1/2 left-3 z-40 -translate-y-1/2 rounded-full bg-white/25 p-2 text-white backdrop-blur-sm hover:bg-white/40"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={next}
              aria-label="Next slide"
              className="absolute top-1/2 right-3 z-40 -translate-y-1/2 rounded-full bg-white/25 p-2 text-white backdrop-blur-sm hover:bg-white/40"
            >
              <ChevronRight size={20} />
            </button>

            <div className="absolute right-3 bottom-3 z-40 flex gap-1.5">
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
