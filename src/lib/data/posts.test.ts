import { describe, expect, it } from "vitest";
import { maskMilestone } from "./posts";

// R2: an old auto milestone shows its amount only while that group is public at `exact`.

const post = (key: string, startup: Record<string, unknown>) =>
  ({
    type: "milestone",
    milestone_key: key,
    body: "JaoPor แตะ ฿10,000 MRR",
    startup: { id: 7, is_demo: false, ...startup },
  }) as unknown as Parameters<typeof maskMilestone>[0];

describe("maskMilestone", () => {
  it("legacy schema: unchanged", () => {
    expect(
      maskMilestone(post("mrr_10000:7", { verification_status: "verified" })),
    ).toEqual({
      key: "mrr_10000:7",
      body: "JaoPor แตะ ฿10,000 MRR",
    });
  });

  it("exact: the amount stays", () => {
    expect(
      maskMilestone(post("mrr_10000:7", { revenue_level: "exact" }))?.key,
    ).toBe("mrr_10000:7");
  });

  it("band / growth / badge: becomes 'verified its revenue', the stored body is dropped", () => {
    for (const level of ["band", "growth", "badge"])
      expect(
        maskMilestone(post("revenue_100000:7", { revenue_level: level })),
      ).toEqual({
        key: "verified:7",
        body: "",
      });
  });

  it("private revenue, or stars without exact build: the post is dropped", () => {
    expect(
      maskMilestone(post("mrr_10000:7", { revenue_level: null })),
    ).toBeNull();
    expect(
      maskMilestone(post("verified:7", { revenue_level: null })),
    ).toBeNull();
    expect(
      maskMilestone(
        post("stars_100:7", { revenue_level: "exact", build_level: "badge" }),
      ),
    ).toBeNull();
    expect(
      maskMilestone(
        post("stars_100:7", { revenue_level: null, build_level: "exact" }),
      )?.key,
    ).toBe("stars_100:7");
  });

  it("not a milestone: untouched", () => {
    const p = {
      ...post("x", { revenue_level: null }),
      type: "feature",
      milestone_key: null,
    };
    expect(maskMilestone(p)).toEqual({
      key: null,
      body: "JaoPor แตะ ฿10,000 MRR",
    });
  });
});
