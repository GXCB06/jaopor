"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// Design.md §5 Profile layout, sticky identity (owner 2026-10-12: "when I scroll down I lose the
// product's name"). Below `lg` the left column scrolls away, so once the element with id `watch`
// (the logo + name block) has left the screen, a slim bar slides down under the site header with
// the children (small logo, name, visit button). From `lg` the left column itself stays pinned,
// so the bar never shows there.

export function StickyIdentity({
  watch,
  children,
}: {
  watch: string;
  children: React.ReactNode;
}) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const target = document.getElementById(watch);
    if (!target) return;
    // The site header (h-14) covers the top of the screen: count the name as gone once it is
    // under the header.
    const io = new IntersectionObserver(
      ([e]) => setShown(!e.isIntersecting && e.boundingClientRect.top < 0),
      { rootMargin: "-64px 0px 0px 0px" },
    );
    io.observe(target);
    return () => io.disconnect();
  }, [watch]);

  return (
    <div
      aria-hidden={!shown}
      inert={!shown}
      className={cn(
        "fixed inset-x-0 top-14 z-30 border-b bg-background/95 backdrop-blur transition-[translate,opacity] duration-(--motion-base) ease-(--ease-settle) lg:hidden",
        shown
          ? "translate-y-0 opacity-100"
          : "pointer-events-none -translate-y-full opacity-0",
      )}
    >
      <div className="mx-auto flex h-12 w-full max-w-5xl items-center gap-2.5 px-4">
        {children}
      </div>
    </div>
  );
}
