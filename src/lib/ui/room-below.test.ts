import { describe, expect, it } from "vitest";
import { listHeight, scrollNeeded } from "./room-below";

describe("scrollNeeded", () => {
  it("no scroll when the list already fits below", () => {
    expect(scrollNeeded(400, 300, 500)).toBe(0);
  });

  it("scrolls exactly the missing room", () => {
    expect(scrollNeeded(100, 300, 500)).toBe(200);
  });

  it("never slides the trigger under the sticky header", () => {
    // trigger at 150 px, header-safe line at 72 → at most 78 px
    expect(scrollNeeded(50, 300, 150)).toBe(78);
    expect(scrollNeeded(50, 300, 40)).toBe(0);
  });
});

describe("listHeight", () => {
  it("grows with rows and headings and is capped", () => {
    expect(listHeight(3)).toBe(3 * 44 + 12);
    expect(listHeight(3, 1, 44)).toBe(3 * 44 + 30 + 12 + 44);
    expect(listHeight(77, 6)).toBe(352);
  });
});
