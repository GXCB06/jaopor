"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Design.md §7 Loading, instant page feedback (owner 2026-10-13: the site felt "หน่วง"; pages showed
 * nothing for 0.3–0.7 s after a click while the server rendered). A thin brand bar at the top
 * starts the moment an internal link is clicked and finishes when the new page is on screen.
 * Not a route-level loading.tsx: streaming a shell first turns real 404s into 200s.
 */
export function NavProgress() {
  const pathname = usePathname();
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");

  // A new path rendered: complete the bar, then hide it.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reacts to the route change
    setState((s) => (s === "busy" ? "done" : s));
    const timer = setTimeout(() => setState("idle"), 300);
    return () => clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      // Same page (only the hash or nothing changes): no navigation to wait for.
      if (url.pathname === location.pathname && url.search === location.search)
        return;
      setState("busy");
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  // Never stuck: give up after 10 s (a failed or cancelled navigation).
  useEffect(() => {
    if (state !== "busy") return;
    const timer = setTimeout(() => setState("idle"), 10000);
    return () => clearTimeout(timer);
  }, [state]);

  if (state === "idle") return null;
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5"
    >
      <div
        className={
          state === "busy"
            ? "nav-progress h-full bg-brand"
            : "h-full w-full bg-brand opacity-0 transition-opacity duration-300"
        }
      />
    </div>
  );
}
