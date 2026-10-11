import { describe, expect, it } from "vitest";
import { LIVE_WINDOW_MS, syncedRecently } from "./live";

const now = Date.parse("2026-10-11T12:00:00Z");

describe("syncedRecently", () => {
  it("is live within 26 hours of the last sync", () => {
    expect(syncedRecently("2026-10-11T11:00:00Z", now)).toBe(true);
    expect(
      syncedRecently(new Date(now - LIVE_WINDOW_MS).toISOString(), now),
    ).toBe(true);
  });

  it("is not live after 26 hours, without a sync, or with a bad date", () => {
    expect(
      syncedRecently(new Date(now - LIVE_WINDOW_MS - 1).toISOString(), now),
    ).toBe(false);
    expect(syncedRecently(null, now)).toBe(false);
    expect(syncedRecently(undefined, now)).toBe(false);
    expect(syncedRecently("not a date", now)).toBe(false);
  });

  it("never treats a sync time in the future as live", () => {
    expect(syncedRecently("2026-10-12T12:00:00Z", now)).toBe(false);
  });
});
