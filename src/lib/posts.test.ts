import { describe, expect, it } from "vitest";
import {
  canEdit,
  isManualPostType,
  normalizeLink,
  postErrorKey,
  timeAgo,
} from "./posts";

describe("posts helpers", () => {
  it("never lets people pick the milestone type", () => {
    expect(isManualPostType("feature")).toBe(true);
    expect(isManualPostType("milestone")).toBe(false);
    expect(isManualPostType("x")).toBe(false);
  });

  it("normalizes links to http(s) only", () => {
    expect(normalizeLink("jaopor.vercel.app/th")).toBe(
      "https://jaopor.vercel.app/th",
    );
    expect(normalizeLink(" HTTPS://Example.com ")).toBe("https://example.com/");
    expect(normalizeLink("javascript:alert(1)")).toBeNull();
    expect(normalizeLink("ftp://example.com")).toBeNull();
    expect(normalizeLink("localhost")).toBeNull();
    expect(normalizeLink("")).toBeNull();
    expect(normalizeLink(`https://a.com/${"x".repeat(600)}`)).toBeNull();
  });

  it("allows edits for 15 minutes", () => {
    const now = Date.parse("2026-10-01T12:00:00Z");
    expect(canEdit("2026-10-01T11:50:00Z", now)).toBe(true);
    expect(canEdit("2026-10-01T11:44:00Z", now)).toBe(false);
  });

  it("formats relative times and falls back to a date", () => {
    const now = Date.parse("2026-10-01T12:00:00Z");
    expect(timeAgo("2026-10-01T11:55:00Z", "en", now)).toBe("5 minutes ago");
    expect(timeAgo("2026-10-01T09:00:00Z", "en", now)).toBe("3 hours ago");
    expect(timeAgo("2026-09-30T12:00:00Z", "en", now)).toBe("yesterday");
    expect(timeAgo("2026-07-01T12:00:00Z", "en", now)).toBe("Jul 1, 2026");
  });

  it("maps database error codes", () => {
    expect(postErrorKey("54000")).toBe("limit");
    expect(postErrorKey("42501")).toBe("forbidden");
    expect(postErrorKey(undefined)).toBe("failed");
  });
});
