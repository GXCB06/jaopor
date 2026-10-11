// Design.md §7 Motion — live pulse: the daily cron syncs every source, so a sync within 26 h
// (a day plus slack for a late run) means the verified numbers are current.
export const LIVE_WINDOW_MS = 26 * 60 * 60 * 1000;

export function syncedRecently(
  syncedAt: string | null | undefined,
  now: number = Date.now(),
): boolean {
  if (!syncedAt) return false;
  const at = Date.parse(syncedAt);
  if (Number.isNaN(at)) return false;
  return at <= now && now - at <= LIVE_WINDOW_MS;
}
