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

describe("share modal helpers (spec 6.5)", () => {
  it("builds README Markdown", async () => {
    const { badgeMarkdown } = await import("./share");
    expect(
      badgeMarkdown(
        "https://jaopor.vercel.app/th/startup/x",
        "https://jaopor.vercel.app/api/badge/x.svg",
        "X [beta]",
      ),
    ).toBe(
      "[![X beta on JaoPor](https://jaopor.vercel.app/api/badge/x.svg)](https://jaopor.vercel.app/th/startup/x)",
    );
  });

  it("puts total revenue first on the badge card", async () => {
    const { badgeHeadline } = await import("./share");
    const verified = {
      ...base,
      verification_status: "verified",
      verified_provider: "stripe",
      mrr_cents: 50_000,
      revenue_all_time_cents: 1_234_500,
    };
    expect(badgeHeadline(verified)).toEqual({
      id: "revenueAllTime",
      value: "$12.3k",
    });
    expect(badgeHeadline({ ...verified, revenue_all_time_cents: 0 })?.id).toBe(
      "mrr",
    );
    expect(badgeHeadline({ ...verified, is_demo: true })).toBeNull();
    expect(
      badgeHeadline({ ...base, revenue_all_time_cents: 999, visitors_30d: 10 })
        ?.id,
    ).toBe("visitors30d");
  });

  it("picks the heatmap currency glyph", async () => {
    const { projectCurrencySymbol } = await import("./share");
    expect(
      projectCurrencySymbol({ pricing_currency: "THB", country: "US" }),
    ).toBe("฿");
    expect(
      projectCurrencySymbol({ pricing_currency: "USD", country: "TH" }),
    ).toBe("$");
    expect(
      projectCurrencySymbol({ pricing_currency: null, country: "TH" }),
    ).toBe("฿");
    expect(
      projectCurrencySymbol({ pricing_currency: null, country: "SG" }),
    ).toBe("$");
  });
});
