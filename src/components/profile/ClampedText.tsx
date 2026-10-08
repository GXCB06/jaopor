"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/** Design.md §5 Profile header: below `sm` a long description shows 4 lines with "อ่านต่อ". */
const LONG = 160;

export function ClampedText({
  text,
  more,
  less,
  className,
}: {
  text: string;
  more: string;
  less: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const long = text.length > LONG;
  return (
    <div className="space-y-1">
      <p
        className={cn(
          "whitespace-pre-line",
          long && !open && "max-sm:line-clamp-4",
          className,
        )}
      >
        {text}
      </p>
      {long && (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="font-mono text-caption text-brand-text hover:underline sm:hidden"
        >
          {open ? less : more}
        </button>
      )}
    </div>
  );
}
