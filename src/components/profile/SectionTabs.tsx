"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// Design.md §5 Profile layout, section tabs (owner 2026-10-12): a row of links to the parts of a
// long project page, pinned under the header and the identity bar while the page scrolls. The
// tab of the part on screen is marked. Tabs whose part renders nothing for this visitor (e.g. no
// screenshots) are dropped after the first paint; with fewer than three parts left the row goes
// away.

export type SectionTab = { id: string; label: string };

export function SectionTabs({
  tabs,
  label,
}: {
  tabs: SectionTab[];
  label: string;
}) {
  const [shown, setShown] = useState(tabs);
  const few = tabs.length < 3;
  const [active, setActive] = useState(tabs[0]?.id ?? "");

  useEffect(() => {
    if (few) return;
    const present = tabs.filter((tab) => {
      const el = document.getElementById(tab.id);
      return el !== null && el.offsetHeight > 0;
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- measured from the DOM after paint
    setShown(present);
    // The part whose top has most recently passed the pinned row is the active one.
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-140px 0px -55% 0px" },
    );
    for (const tab of present) {
      const el = document.getElementById(tab.id);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, [tabs, few]);

  // A short page needs no tabs: only with three or more parts that have content.
  if (few || shown.length < 3) return null;
  return (
    <nav
      aria-label={label}
      className="sticky top-[6.5rem] z-20 -mx-4 border-b bg-background/95 px-4 backdrop-blur lg:mx-0 lg:px-0"
    >
      <ul className="flex [scrollbar-width:none] gap-1 overflow-x-auto">
        {shown.map((tab) => (
          <li key={tab.id} className="shrink-0">
            <a
              href={`#${tab.id}`}
              aria-current={active === tab.id ? "location" : undefined}
              onClick={() => setActive(tab.id)}
              className={cn(
                "-mb-px inline-flex h-10 items-center border-b-2 px-3 text-caption font-semibold whitespace-nowrap transition-colors",
                active === tab.id
                  ? "border-brand text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
