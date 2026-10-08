"use client";

import { InfoIcon } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

/**
 * Design.md §5 MetricHelp: an info button beside a tile label that explains what the number counts
 * and where it comes from. The popover opens across the tile row (the row is `relative`), so it
 * is readable on phones; Esc, a click outside or the button close it. Works on touch.
 */
export function MetricHelp({
  label,
  children,
}: {
  /** Accessible name of the button, e.g. "MRR คืออะไร". */
  label: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (
        e instanceof KeyboardEvent
          ? e.key === "Escape"
          : !ref.current?.contains(e.target as Node)
      )
        setOpen(false);
    };
    document.addEventListener("keydown", close);
    document.addEventListener("pointerdown", close);
    return () => {
      document.removeEventListener("keydown", close);
      document.removeEventListener("pointerdown", close);
    };
  }, [open]);

  return (
    <span ref={ref} className="shrink-0">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="-m-1 inline-flex size-6 items-center justify-center rounded-md text-faint hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <InfoIcon className="size-3.5" aria-hidden="true" />
      </button>
      {open && (
        <span
          id={id}
          role="note"
          className="absolute inset-x-0 top-12 z-10 block space-y-1.5 rounded-md border bg-popover p-3 text-caption font-normal tracking-normal text-muted-foreground normal-case shadow-md sm:inset-x-3"
        >
          {children}
        </span>
      )}
    </span>
  );
}
