"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { HeroSlide } from "@/models";
import { useHeroSlider } from "@/controllers/useHeroSlider";
import { formatPromoDiscount, withPromoParam } from "@/lib/promo";

// Positioned as percentages of the card, same coordinate space the arch/
// badge use below (both anchored at the 50% seam) — cosmetic only.
const DOTS = [
  { size: "1.4%", top: "12%", left: "30%" },
  { size: "2.2%", top: "26%", left: "38%" },
  { size: "1%", top: "70%", left: "34%" },
];

export function HeroSlider({ slides }: { slides: HeroSlide[] }) {
  const { activeIndex, next, prev, goTo, pause, resume } = useHeroSlider(slides);

  // Was aspect-[1024/585] (~1.75:1) — read as too tall. Wider ratio, same
  // technique, shorter result. min-h floors it on narrow phones — the
  // aspect-ratio alone let the card get so short that the text column's
  // flex children (which don't shrink below their own content's min size
  // by default) overflowed past the card's own bounds and up into the
  // navbar above it.
  const aspectClass = "aspect-[1024/380] min-h-[280px]";

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
          // Every color on the banner derives from this one admin-picked
          // accentColor: the arch itself is the color as-is (not a blend),
          // darkAccent (darkened) covers every solid UI element (badge,
          // button, footer icon, dividers), and cardTint washes the card's
          // own base so the color's presence isn't confined to just those
          // two spots — "the whole banner should contain the flavour of
          // the color", not just the arch and badge.
          const darkAccent = `color-mix(in srgb, ${slide.accentColor}, black 45%)`;
          const cardTint = `color-mix(in srgb, ${slide.accentColor}, white 93%)`;

          return (
            <div
              key={slide.id}
              className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                active ? "opacity-100" : "opacity-0 pointer-events-none"
              }`}
              style={{ background: cardTint }}
              aria-hidden={!active}
            >
              {/* A gentle rightward drift + a richer border on hover — the
                  one purely decorative thing that's allowed to move when
                  the rest of the hover treatment below pulls focus toward
                  the buttons/photo instead of adding to it. */}
              {DOTS.map((dot, dotIdx) => (
                <span
                  key={dotIdx}
                  className="absolute z-20 hidden aspect-square rounded-full transition-all duration-500 ease-out group-hover:translate-x-2 sm:block"
                  style={{
                    width: dot.size,
                    top: dot.top,
                    left: dot.left,
                    border: `1px solid color-mix(in srgb, ${slide.accentColor}, transparent 55%)`,
                  }}
                />
              ))}

              {/* Two equal halves (content / photo), divided by a thin bar
                  exactly on the 50% seam, rounded into a pill so it still
                  reads as an arch rather than a hard rule. Was 16-25px
                  (too fat) with a white-lightened gradient (read as washed
                  out) — thinner now, and the gradient stays inside the
                  accent color's own richness (pure color on the
                  photo-facing edge, darkened on the text-facing edge)
                  instead of lightening toward white. */}
              <div
                aria-hidden="true"
                className="absolute inset-y-0 z-10 w-[8px] rounded-full sm:w-[10px] md:w-[12px]"
                style={{
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: `linear-gradient(to left, ${slide.accentColor}, color-mix(in srgb, ${slide.accentColor}, black 25%))`,
                }}
              />

              {/* Hover's whole point: pull focus toward the photo and the
                  buttons, not lift the card as a block — a gentle zoom
                  here is half of that. */}
              <div
                className="absolute inset-y-0 right-0 z-0 overflow-hidden"
                style={{ left: "50%" }}
              >
                <Image
                  src={slide.image}
                  alt={slide.title}
                  fill
                  priority={i === 0}
                  className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                />
              </div>

              {/* Sits centered on the divider — the logo's one spot on
                  this banner, always (the offer, when there is one, is a
                  pill in the text column below instead — see there). */}
              <div
                className="absolute z-20 flex aspect-square w-[9%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 shadow-lg"
                style={{ left: "50%", top: "50%", background: darkAccent, borderColor: cardTint }}
              >
                <Image
                  src="/logo-icon-white.png"
                  alt=""
                  width={424}
                  height={291}
                  className="h-[32%] w-auto"
                />
              </div>

              <div className="relative z-30 flex h-full min-h-0 w-1/2 flex-col py-[5%] pr-[4%] pl-[7%]">
                {/* Centered in the space above the footer — not the full
                    card height, so the footer's thin line stays pinned to
                    the bottom instead of drifting up with everything else
                    when this centers. */}
                <div className="flex min-h-0 flex-1 flex-col justify-center">
                  {/* In focus at rest; softens on hover as the photo/
                      buttons take over as the focus instead — the actual
                      "motive" of hovering this banner, not a generic
                      card-lift. The CTA row is deliberately its own block
                      below, outside this dimming treatment — it gets the
                      opposite, see there. */}
                  <div className="max-w-full transition-opacity duration-300 group-hover:opacity-70">
                    <span
                      className="block text-[clamp(13px,2vw,20px)] text-muted italic"
                      style={{ fontFamily: "var(--font-playfair)" }}
                    >
                      {slide.eyebrow}
                    </span>
                    <h1 className="mt-0.5 block text-[clamp(18px,3.4vw,32px)] leading-none font-extrabold text-foreground">
                      {slide.title}
                    </h1>
                    <p className="mt-2 max-w-[260px] text-[clamp(9px,1vw,12px)] leading-relaxed text-muted">
                      {slide.subtitle}
                    </p>
                    {/* The offer lives here, left-aligned with the rest of
                        the text column, instead of as text inside the
                        middle badge — the badge is the logo's one spot on
                        this banner now, always, not conditional on
                        whether there's a promo. */}
                    {slide.promo && (
                      <p
                        className="mt-2 w-fit rounded-full px-3 py-1 text-[clamp(9px,1vw,12px)] font-semibold text-white"
                        style={{ background: darkAccent }}
                      >
                        {formatPromoDiscount(slide.promo)} with code {slide.promo.code}
                      </p>
                    )}
                  </div>

                  {/* The other half of the hover's focus-shift: buttons
                      pop slightly forward instead of dimming with the
                      text above them. */}
                  <div className="mt-3 flex flex-wrap items-center gap-2.5">
                    <span className="hidden h-6 w-[2px] sm:block" style={{ background: darkAccent }} />
                    <Link
                      href={withPromoParam(slide.primaryCta.href, slide.promo?.code)}
                      className="rounded-full px-5 py-2 text-[clamp(10px,1.1vw,13px)] font-semibold text-white transition-transform duration-300 group-hover:scale-105"
                      style={{ background: darkAccent }}
                    >
                      {slide.primaryCta.label}
                    </Link>
                    {slide.secondaryCta && (
                      <Link
                        href={withPromoParam(slide.secondaryCta.href, slide.promo?.code)}
                        className="text-[clamp(10px,1.1vw,13px)] font-semibold text-foreground underline underline-offset-4 transition-transform duration-300 group-hover:scale-105"
                      >
                        {slide.secondaryCta.label}
                      </Link>
                    )}
                  </div>
                </div>

                {/* Pinned to the bottom, with its thin top line, regardless
                    of how the block above centers. */}
                <div
                  className="flex items-center gap-2 border-t pt-2 text-[clamp(8px,0.9vw,12px)] font-medium text-foreground transition-opacity duration-300 group-hover:opacity-70"
                  style={{ borderColor: `color-mix(in srgb, ${slide.accentColor}, transparent 75%)` }}
                >
                  <span
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white"
                    style={{ background: darkAccent }}
                  >
                    <Sparkles size={10} />
                  </span>
                  Simple shopping, happier days.
                </div>
              </div>
            </div>
          );
        })}

        {slides.length > 1 && (
          <>
            {/* Both together, centered under the photo half — left-3/
                right-3 used to put the "previous" button over the text
                column, which is a light background now, so a white
                translucent button all but disappeared there. */}
            <div
              className="absolute bottom-4 z-40 flex -translate-x-1/2 items-center gap-2"
              style={{ left: "75%" }}
            >
              <button
                onClick={prev}
                aria-label="Previous slide"
                className="rounded-full bg-white/25 p-2 text-white backdrop-blur-sm hover:bg-white/40"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={next}
                aria-label="Next slide"
                className="rounded-full bg-white/25 p-2 text-white backdrop-blur-sm hover:bg-white/40"
              >
                <ChevronRight size={18} />
              </button>
            </div>

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
