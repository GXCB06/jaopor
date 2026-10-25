"use client";

import {
  BadgeCheckIcon,
  MedalIcon,
  NewspaperIcon,
  TargetIcon,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// Design.md §6 Dashboard overview, Welcome tour (owner 2026-10-25): what JaoPor does, in 4 slides,
// once per browser on the first dashboard visit. Esc / ✕ / "เริ่มเลย" all close it for good.

const KEY = "jaopor.tour.v1";
const SLIDES: { id: string; icon: LucideIcon }[] = [
  { id: "real", icon: BadgeCheckIcon },
  { id: "feed", icon: NewspaperIcon },
  { id: "olympics", icon: MedalIcon },
  { id: "missions", icon: TargetIcon },
];

export function WelcomeTour() {
  const t = useTranslations("Tour");
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);

  // After hydration: show it once per browser (a storage error means: don't show).
  useEffect(() => {
    let seen = true;
    try {
      seen = localStorage.getItem(KEY) === "1";
    } catch {
      seen = true;
    }
    if (seen) return;
    const timer = setTimeout(() => setOpen(true), 400);
    return () => clearTimeout(timer);
  }, []);

  function close() {
    setOpen(false);
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      // Blocked storage: it may show again next visit, which is harmless.
    }
  }

  const slide = SLIDES[i];
  const Icon = slide.icon;
  const last = i === SLIDES.length - 1;
  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : close())}>
      <DialogContent className="max-w-sm">
        <div className="flex flex-col items-center gap-4 pt-2 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-brand/10 text-brand-text">
            <Icon className="size-6" aria-hidden="true" />
          </span>
          <DialogTitle className="text-lg font-bold">
            {t(`${slide.id}.title`)}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {t(`${slide.id}.body`)}
          </DialogDescription>
          <div className="flex gap-1.5" aria-hidden="true">
            {SLIDES.map((s, n) => (
              <span
                key={s.id}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-(--motion-fast)",
                  n === i ? "w-5 bg-brand" : "w-1.5 bg-secondary",
                )}
              />
            ))}
          </div>
          <p className="sr-only" aria-live="polite">
            {t("position", { n: i + 1, of: SLIDES.length })}
          </p>
          <div className="flex w-full gap-2">
            {i > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setI(i - 1)}
                className="flex-1"
              >
                {t("back")}
              </Button>
            )}
            <Button
              type="button"
              onClick={() => (last ? close() : setI(i + 1))}
              className="flex-1"
            >
              {last ? t("start") : t("next")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
