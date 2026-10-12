"use client";

import { ChevronDownIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// Design.md §5 Profile layout, shorter page (owner 2026-10-12): a long block shows its first
// `limit` (CSS length) with a fade and a "show all" button. Content is complete in the HTML and
// only clipped after the script measures it taller than the limit, so nothing is lost without JS.

export function ShowMore({
  limit = "26rem",
  more,
  less,
  children,
}: {
  limit?: string;
  more: string;
  less: string;
  children: React.ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [tall, setTall] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const check = () => {
      const max = parseFloat(getComputedStyle(el).getPropertyValue("--limit"));
      const px =
        max * parseFloat(getComputedStyle(document.documentElement).fontSize);
      setTall(el.scrollHeight > px + 48);
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const clipped = tall && !open;
  return (
    <div>
      <div
        ref={box}
        style={{ "--limit": limit } as React.CSSProperties}
        className={cn(
          "relative",
          clipped &&
            "max-h-(--limit) overflow-hidden after:absolute after:inset-x-0 after:bottom-0 after:h-24 after:bg-linear-to-t after:from-background after:to-transparent",
        )}
      >
        {children}
      </div>
      {tall && (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="mt-3 inline-flex items-center gap-1 rounded-md border bg-card px-3 py-1.5 text-caption font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          {open ? less : more}
          <ChevronDownIcon
            className={cn(
              "size-3.5 transition-transform",
              open && "rotate-180",
            )}
            aria-hidden="true"
          />
        </button>
      )}
    </div>
  );
}
