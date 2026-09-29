import { describe, expect, it } from "vitest";
import {
  badgeHtml,
  badgeValue,
  shareLinks,
  shareMetrics,
  verifiedSources,
} from "./share";

const base = {
  verification_status: "unverified",
  verified_provider: null,
  mrr_cents: null,
  revenue_30d_cents: null,
  visitors_30d: null,
  traffic_provider: null,
  active_users: null,
  build_commits: null,
  github_repo: null,
};

describe("shareMetrics", () => {
  it("is empty for an unverified project", () => {
    expect(shareMetrics(base)).toEqual([]);
    expect(badgeValue(base)).toBe(null);
  });

  it("never shows numbers for a demo project (sample data)", () => {
    const demo = {
      ...base,
      is_demo: true,
      verification_status: "verified",
      verified_provider: "stripe",
      mrr_cents: 185_000,
      visitors_30d: 9_420,
      traffic_provider: "plausible",
    };
    expect(shareMetrics(demo)).toEqual([]);
    expect(verifiedSources(demo)).toEqual([]);
    expect(badgeValue(demo)).toBe(null);
  });

  it("puts revenue first, then traffic, then build proof", () => {
    const s = {
      ...base,
      verification_status: "verified",
      verified_provider: "stripe",
      mrr_cents: 290_000,
      revenue_30d_cents: 310_000,
      visitors_30d: 12_840,
      traffic_provider: "plausible",
      build_commits: 731,
      github_repo: "me/app",
    };
    expect(shareMetrics(s).map((m) => m.id)).toEqual([
      "mrr",
      "revenue30d",
      "visitors30d",
    ]);
    expect(verifiedSources(s)).toEqual(["Stripe", "Plausible", "GitHub"]);
    expect(badgeValue(s)).toMatch(/MRR$/);
  });

  it("ignores self-typed numbers on unverified revenue", () => {
    const s = {
      ...base,
      mrr_cents: 999_999,
      build_commits: 731,
      github_repo: "me/app",
    };
    expect(shareMetrics(s)).toEqual([{ id: "commits", value: "731" }]);
    expect(badgeValue(s)).toBe("731 commits");
  });
});

describe("share links + badge html", () => {
  it("encodes the url", () => {
    const l = shareLinks("https://x.test/th/startup/a b", "hi & bye");
    expect(l.facebook).toContain(
      "u=https%3A%2F%2Fx.test%2Fth%2Fstartup%2Fa%20b",
    );
    expect(l.x).toContain("text=hi%20%26%20bye");
  });
  it("escapes the name in alt text", () => {
    expect(badgeHtml("https://p", "https://b", '<script>"x"')).toBe(
      '<a href="https://p"><img src="https://b" alt="scriptx on JaoPor" height="28"></a>',
    );
  });
});
