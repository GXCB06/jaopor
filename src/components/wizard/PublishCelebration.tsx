"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { StartupLogo } from "@/components/StartupBits";
import { cn } from "@/lib/utils";

// Design.md §5 Add-startup wizard v4 "Celebration (on publish)": a short full-screen moment, then
// the profile. CSS keyframes only (globals.css celebrate-pop / confetti-fall), tokens for colour,
// transform + opacity; with reduced motion nothing moves and the text shows for 1.2 s.

const COLORS = ["bg-brand", "bg-positive", "bg-warning"] as const;
const BITS = 24;

/** A fixed spread per bit (no Math.random in render): position, drift, spin, delay, colour. */
const bits = Array.from({ length: BITS }, (_, i) => {
  const t = (i * 37) % BITS; // a stable shuffle of 0..23
  return {
    left: `${4 + ((t * 92) / BITS).toFixed(1)}%`,
    x: `${((i % 2 ? 1 : -1) * (8 + ((i * 13) % 22))).toFixed(0)}vw`,
    r: `${(i % 3 ? 1 : -1) * (240 + ((i * 47) % 300))}deg`,
    delay: `${(t * 35) % 600}ms`,
    color: COLORS[i % COLORS.length],
    wide: i % 4 === 0,
  };
});

export function PublishCelebration({
  name,
  logoSrc,
  onDone,
}: {
  name: string;
  logoSrc: string | null;
  onDone: () => void;
}) {
  const t = useTranslations("Wizard");

  useEffect(() => {
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const timer = setTimeout(onDone, reduce ? 1200 : 2400);
    const key = (e: KeyboardEvent) => e.key === "Escape" && onDone();
    document.addEventListener("keydown", key);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", key);
    };
  }, [onDone]);

  return (
    <div
      role="status"
      aria-live="polite"
      onClick={onDone}
      className="fixed inset-0 z-50 flex cursor-pointer items-center justify-center overflow-hidden bg-background/90 backdrop-blur-sm"
    >
      {bits.map((b, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={cn(
            "absolute top-0 rounded-[2px] opacity-0",
            b.wide ? "h-1.5 w-3" : "h-2.5 w-1.5",
            b.color,
          )}
          style={
            {
              left: b.left,
              "--confetti-x": b.x,
              "--confetti-r": b.r,
              animation: `confetti-fall 1.8s var(--ease-settle) ${b.delay} both`,
            } as React.CSSProperties
          }
        />
      ))}
      <div
        className="flex flex-col items-center gap-4 px-6 text-center"
        style={{
          animation: "celebrate-pop var(--motion-slow) var(--ease-settle) both",
        }}
      >
        <span className="flex size-24 items-center justify-center rounded-full bg-brand/10 ring-4 ring-brand/40">
          <StartupLogo
            name={name}
            src={logoSrc}
            size={56}
            className="rounded-xl"
          />
        </span>
        <p className="text-2xl font-bold tracking-tight">
          {t("celebrate.title")}
        </p>
        <p className="text-sm text-muted-foreground">
          {t("celebrate.body", { name })}
        </p>
        <span className="text-caption text-brand-text">
          {t("celebrate.go")} →
        </span>
      </div>
    </div>
  );
}
