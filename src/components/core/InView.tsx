"use client";

import { useEffect, useRef } from "react";

/**
 * Design.md §7 Motion — InView: marks its element `data-in="1"` the first time about 30% of it is
 * on screen, then `data-in="done"` after `settle` ms, so CSS effects play once and never replay
 * (period / metric / currency switches re-render children but the element keeps `done`).
 * The attribute is set on the DOM directly: no React state, no re-render. Before it is seen, the
 * CSS start state applies only while `data-inview` is present and `data-in` isn't (see globals.css,
 * with a 3 s failsafe), so without JS the final values simply show.
 */
export function InView({
  as: Tag = "div",
  settle = 1200,
  className,
  children,
}: {
  as?: "div" | "span" | "section";
  /** ms after the first view before the element counts as settled (the longest effect + stagger). */
  settle?: number;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const settleNow = () => el.setAttribute("data-in", "done");
    if (
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      settleNow();
      return;
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        el.setAttribute("data-in", "1");
        timer = setTimeout(settleNow, settle);
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      if (timer) clearTimeout(timer);
    };
  }, [settle]);

  return (
    <Tag
      ref={ref as React.Ref<HTMLDivElement>}
      data-inview=""
      className={className}
    >
      {children}
    </Tag>
  );
}
