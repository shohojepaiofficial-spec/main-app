"use client";

import { useCallback, useEffect, useState } from "react";
import { HeroSlide } from "@/models";

const AUTOPLAY_MS = 6000;

export function useHeroSlider(slides: HeroSlide[]) {
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const next = useCallback(() => {
    setIndex((i) => (slides.length ? (i + 1) % slides.length : 0));
  }, [slides.length]);

  const prev = useCallback(() => {
    setIndex((i) => (slides.length ? (i - 1 + slides.length) % slides.length : 0));
  }, [slides.length]);

  const goTo = useCallback((i: number) => setIndex(i), []);

  useEffect(() => {
    if (isPaused || slides.length <= 1) return;
    const timer = setInterval(next, AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [isPaused, next, slides.length]);

  return {
    activeIndex: index,
    next,
    prev,
    goTo,
    pause: () => setIsPaused(true),
    resume: () => setIsPaused(false),
  };
}
