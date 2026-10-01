import { describe, expect, it } from "vitest";
import { groupMessages, totalUnread } from "./chat";

describe("chat helpers", () => {
  it("groups messages into days and runs of the same sender", () => {
    const m = (id: number, senderId: string, createdAt: string) => ({
      id,
      senderId,
      createdAt,
    });
    const days = groupMessages([
      m(1, "a", "2026-10-01T09:00:00"),
      m(2, "a", "2026-10-01T09:01:00"),
      m(3, "b", "2026-10-01T09:02:00"),
      m(4, "b", "2026-10-02T08:00:00"),
    ]);
    expect(days.map((d) => d.day)).toEqual(["2026-10-01", "2026-10-02"]);
    expect(
      days[0].runs.map((r) => [r.senderId, r.items.map((i) => i.id)]),
    ).toEqual([
      ["a", [1, 2]],
      ["b", [3]],
    ]);
    // A new day starts a new run even with the same sender.
    expect(days[1].runs[0].items.map((i) => i.id)).toEqual([4]);
  });

  it("totals unread counts", () => {
    expect(
      totalUnread(
        new Map([
          [1, 2],
          [5, 3],
        ]),
      ),
    ).toBe(5);
    expect(totalUnread(new Map())).toBe(0);
  });
});
