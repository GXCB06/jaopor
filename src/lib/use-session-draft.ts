"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Keeps an unsaved form in sessionStorage (this tab only) so a language switch, which remounts
 * the whole [locale] layout, doesn't wipe what the user typed. Only real changes are stored: a
 * draft equal to the saved values is removed, never "restored". Restores once on mount.
 * Returns `clear()` for after a successful save. Storage failures are ignored (private mode).
 */
export function useSessionDraft<T>(
  key: string,
  value: T,
  onRestore: (draft: T) => void,
): () => void {
  const ready = useRef(false);
  const restore = useRef(onRestore);
  const initial = useRef(JSON.stringify(value));
  useEffect(() => {
    restore.current = onRestore;
  });

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(key);
      if (raw && raw !== initial.current) restore.current(JSON.parse(raw) as T);
    } catch {
      // Corrupt or blocked storage: start from the server values.
    }
    ready.current = true;
  }, [key]);

  useEffect(() => {
    if (!ready.current) return;
    try {
      const json = JSON.stringify(value);
      if (json === initial.current) sessionStorage.removeItem(key);
      else sessionStorage.setItem(key, json);
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
