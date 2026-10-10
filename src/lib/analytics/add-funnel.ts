"use client";

import { createClient } from "@/lib/supabase/client";
import type { Json } from "@/lib/supabase/database.types";
import type { AddEventProps, FunnelEvent } from "./funnel-types";

// Add-project funnel analytics (first-party, no cookies). Design:
// docs/ADD_STARTUP_ANALYTICS_DESIGN.md · migration: docs/ADD_STARTUP_ANALYTICS_MIGRATION.md.
//
// Nothing here may affect the UI: logAddEvent never awaits its RPC, swallows both promise outcomes,
// and nothing reads the result. If the migration isn't applied the call 404s silently. Only a
// signed-in founder's own rows are written (user_id comes from auth.uid() server-side).
//
// The whitelists live in ./funnel-types.ts (shared with the server route and the parity test).
export * from "./funnel-types";

/** A fresh, random attempt id (kept in the wizard's session draft so a refresh continues it). */
export function newAttemptId(): string {
  return crypto.randomUUID();
}

/**
 * Record one add-project funnel event for the signed-in user. Fire-and-forget: never awaited,
 * never throws, never read. `startupId` is required for `add_created`, `verify_chose` and
 * `add_finished` (omitted for `add_opened` and for step-1 `add_failed`).
 */
export function logAddEvent(
  attemptId: string,
  event: FunnelEvent,
  startupId?: number | null,
  props?: AddEventProps,
): void {
  try {
    const payload: Record<string, string | boolean> = {};
    if (props?.code !== undefined) payload.code = props.code;
    if (props?.choice !== undefined) payload.choice = props.choice;
    if (props?.skipped !== undefined) payload.skipped = props.skipped;

    void createClient()
      .rpc("log_add_event", {
        p_attempt: attemptId,
        p_event: event,
        ...(startupId == null ? {} : { p_startup: startupId }),
        p_props: payload as Json,
      })
      .then(
        () => undefined,
        () => undefined,
      );
  } catch {
    // Analytics never surfaces an error, and never blocks the add-project flow.
  }
}
