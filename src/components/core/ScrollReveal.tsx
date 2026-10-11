"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Design.md §7 Motion — section reveal (owner request 2026-10-11): as a visitor scrolls down a
 * page, each top-level <section> of <main> fades up once as it comes into view.
 *
 * Nothing is hidden in the HTML: sections on screen when the page loads are left alone, and only
 * the ones still below the fold get `data-reveal="wait"` (out of view, so the visitor never sees
 * them disappear); CSS plays the effect when they become `in`. No JS, no IntersectionObserver or
 * reduced motion → nothing changes. Runs again after a client-side navigation.
 *
 * Page enter (owner request 2026-10-11, CSS in globals.css): `html[data-nav="enter"]` fades a new
 * page's blocks up. Back / Forward (popstate) sets "back" before the old page renders, so it
 * appears at once and nothing on it is held for the scroll reveal either; afterwards its blocks
 * are marked `data-entered` and the flag returns to "enter" for the next link.
 */
export function ScrollReveal() {
  const pathname = usePathname();

  useEffect(() => {
    const back = () =>
      document.documentElement.setAttribute("data-nav", "back");
    window.addEventListener("popstate", back);
    return () => window.removeEventListener("popstate", back);
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    if (html.getAttribute("data-nav") === "back") {
      // Seen already: show it as it is, and let the next page opened by a link animate again.
      for (const el of document.querySelectorAll("main > *"))
        el.setAttribute("data-entered", "");
      html.setAttribute("data-nav", "enter");
      return;
    }
    if (
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const main = document.querySelector("main");
    if (!main) return;
    // Top-level sections only: a section inside another one moves with its parent.
    const sections = [...main.querySelectorAll("section")].filter(
      (s) => !s.parentElement?.closest("section"),
    );
    const below = sections.filter(
      (s) =>
        !s.hasAttribute("data-reveal") &&
        s.getBoundingClientRect().top > window.innerHeight,
    );
    if (!below.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.setAttribute("data-reveal", "in");
          io.unobserve(e.target);
        }
      },
      // Starts just before the edge shows, so the fade is under way as it is read.
      { rootMargin: "0px 0px -6% 0px", threshold: 0 },
    );
    for (const s of below) {
      s.setAttribute("data-reveal", "wait");
      io.observe(s);
    }
    return () => {
      io.disconnect();
      // A section still waiting must never stay hidden (e.g. the page changed underneath).
      for (const s of below)
        if (s.getAttribute("data-reveal") === "wait")
          s.removeAttribute("data-reveal");
    };
  }, [pathname]);

  return null;
}
