"use client";

import { useEffect, useRef } from "react";

/**
 * Design.md §5 Multi-step flows (owner 2026-10-13: "กดถัดไปแล้วมันค้างอยู่ส่วนนั้น ต้องเลื่อนขึ้นเอง"):
 * when `step` changes, bring the top of the flow (the element holding the returned ref) back into
 * view and move focus there, so the next step starts at its beginning. Smooth, or instant with
 * reduced motion. Nothing happens on first render, or when the top is already on screen.
 */
export function useStepScroll<T extends HTMLElement>(step: unknown) {
  const ref = useRef<T>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const el = ref.current;
    if (!el) return;
    // The sticky site header is h-14 (56 px): a top hidden under it counts as off screen.
    if (el.getBoundingClientRect().top < 64) {
      const reduce = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      el.scrollIntoView({
        behavior: reduce ? "auto" : "smooth",
        block: "start",
      });
    }
    // Screen readers and keyboards start the new step at its beginning too.
    el.focus({ preventScroll: true });
  }, [step]);
  return ref;
}
