"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Keeps an unsaved form in sessionStorage (this tab only) so a language switch, which remounts
 * the whole [locale] layout, doesn't wipe what the user typed. Restores once on mount.
 * Returns `clear()` for after a successful save. Storage failures are ignored (private mode).
 */
export function useSessionDraft<T>(
  key: string,
  value: T,
  onRestore: (draft: T) => void,
): () => void {
  const ready = useRef(false);
  const restore = useRef(onRestore);
  useEffect(() => {
    restore.current = onRestore;
  });

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(key);
      if (raw) restore.current(JSON.parse(raw) as T);
    } catch {
      // Corrupt or blocked storage: start from the server values.
    }
    ready.current = true;
  }, [key]);

  useEffect(() => {
    if (!ready.current) return;
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Quota / private mode: the form still works, it just won't survive a remount.
    }
  }, [key, value]);

  return useCallback(() => {
    try {
      sessionStorage.removeItem(key);
    } catch {
      // ignore
    }
  }, [key]);
}
