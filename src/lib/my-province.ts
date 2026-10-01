"use client";

// "จังหวัดของคุณ" on the Olympics page: the visitor's own pick, kept in this browser only
// (localStorage, no account needed). Phase 9 profiles can seed it from profiles.province later.
import { useSyncExternalStore } from "react";
import { isProvince } from "@/lib/config/provinces";

const KEY = "jaopor.myProvince";
const EVENT = "jaopor:my-province";

function read(): string | null {
  try {
    const v = localStorage.getItem(KEY);
    return isProvince(v) ? v : null;
  } catch {
    return null;
  }
}

export function setMyProvince(slug: string | null) {
  try {
    if (slug && isProvince(slug)) localStorage.setItem(KEY, slug);
    else localStorage.removeItem(KEY);
  } catch {
    // Blocked storage: the choice lasts for this page view only.
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** The stored province slug (null on the server and when none is picked). */
export function useMyProvince(): string | null {
  return useSyncExternalStore(subscribe, read, () => null);
}
