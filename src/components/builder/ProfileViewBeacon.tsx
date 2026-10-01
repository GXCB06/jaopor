"use client";

import { useEffect } from "react";

const KEY = "jaopor.viewer";

/**
 * Counts one profile view per browser per day (profile_views). Sends a random id kept in this
 * browser; the server stores only an HMAC of it under a daily key — never an IP. Skipped for the
 * owner (server side).
 */
export function ProfileViewBeacon({ profileId }: { profileId: string }) {
  useEffect(() => {
    let vid: string;
    try {
      vid = localStorage.getItem(KEY) ?? crypto.randomUUID();
      localStorage.setItem(KEY, vid);
    } catch {
      vid = crypto.randomUUID();
    }
    fetch("/api/profile-view", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ profileId, vid }),
      keepalive: true,
    }).catch(() => {});
  }, [profileId]);
  return null;
}
