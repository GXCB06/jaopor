"use client";

import { cn } from "@/lib/utils";

/**
 * Spec 2.2 SegmentedControl: near-black pill container; the selected segment is a raised block
 * with a light inner border. A radiogroup, so arrows/tab behave like native radios.
 */
export function SegmentedControl<T extends string | number>({
  value,
  options,
  onChange,
  label,
  className,
}: {
  value: T;
  options: { value: T; label: React.ReactNode }[];
  onChange: (v: T) => void;
  /** Accessible name of the group. */
  label: string;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "flex rounded-lg border bg-background p-0.5 dark:bg-black/40",
        className,
      )}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "flex-1 rounded-md border border-transparent px-2.5 py-1 text-caption transition-colors",
            value === o.value
              ? "border-foreground/10 bg-secondary font-semibold text-foreground shadow-xs dark:bg-black"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
