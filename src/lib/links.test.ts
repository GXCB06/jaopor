import { describe, expect, it } from "vitest";
import {
  checkProjectLink,
  sameWebsite,
  detectLinkKind,
  isOwnWebsite,
  linkPlatform,
  normalizeUrl,
  ownWebsiteHost,
  parseProjectLink,
  projectLinks,
  websiteHost,
} from "./links";

describe("normalizeUrl", () => {
  it("adds https:// to bare domains", () => {
    expect(normalizeUrl(" shop.co.th ")).toBe("https://shop.co.th");
  });
  it("keeps explicit schemes", () => {
    expect(normalizeUrl("http://x.test/a")).toBe("http://x.test/a");
  });
  it("turns a LINE ID into an add-friend link", () => {
    expect(normalizeUrl("@myshop")).toBe("https://line.me/R/ti/p/@myshop");
  });
});

describe("detectLinkKind", () => {
  it.each([
    ["https://apps.apple.com/th/app/x/id123", "app_store"],
    ["https://play.google.com/store/apps/details?id=a.b", "play_store"],
    ["https://lin.ee/AbC", "line"],
    ["https://page.line.me/abc", "line"],
    ["https://github.com/me/repo", "github"],
    ["https://www.github.com/me/repo", "github"],
    ["https://mysaas.ai", "website"],
    ["not a url", "website"],
  ])("%s → %s", (url, kind) => {
    expect(detectLinkKind(url)).toBe(kind);
  });
});

describe("parseProjectLink", () => {
  it("stores websites in website_url", () => {
    expect(parseProjectLink("mysaas.ai")).toEqual({
      kind: "website",
      column: "website_url",
      url: "https://mysaas.ai",
      platform: null,
    });
  });
  it("trims GitHub links to owner/repo", () => {
    expect(
      parseProjectLink("github.com/Me/My-Repo.git/tree/main?x=1")?.url,
    ).toBe("https://github.com/Me/My-Repo");
  });
  it("accepts a LINE ID", () => {
    expect(parseProjectLink("@calbot")?.column).toBe("line_url");
  });
  it("rejects a Play link that is not an app page", () => {
    expect(parseProjectLink("https://play.google.com/store/search?q=x")).toBe(
      null,
    );
  });
  it("upgrades store links to https", () => {
    expect(parseProjectLink("http://apps.apple.com/th/app/x/id1")?.url).toBe(
      "https://apps.apple.com/th/app/x/id1",
    );
  });
  it("returns null for empty input", () => {
    expect(parseProjectLink("  ")).toBe(null);
  });
});

describe("projectLinks / websiteHost", () => {
  it("lists present links, website first", () => {
    expect(
      projectLinks({
        website_url: null,
        app_store_url: null,
        play_store_url: "https://play.google.com/store/apps/details?id=a",
        line_url: "https://lin.ee/x",
        github_url: null,
      }).map((l) => l.kind),
    ).toEqual(["play_store", "line"]);
  });
  it("strips www from the website host", () => {
    expect(websiteHost("https://www.MySaaS.ai/pricing")).toBe("mysaas.ai");
    expect(websiteHost(null)).toBe(null);
  });
});

describe("sameWebsite (one business, one listing)", () => {
  it("matches the same site regardless of www, case, scheme, trailing slash or language root", () => {
    expect(
      sameWebsite("https://jaopor.vercel.app/th", "jaopor.vercel.app"),
    ).toBe(true);
    expect(sameWebsite("https://www.Acme.co.th/", "http://acme.co.th")).toBe(
      true,
    );
    expect(sameWebsite("acme.co.th/en", "acme.co.th/th")).toBe(true);
    expect(sameWebsite("acme.co.th/pricing", "acme.co.th")).toBe(true);
  });
  it("keeps different projects apart", () => {
    expect(sameWebsite("you.github.io/app-a", "you.github.io/app-b")).toBe(
      false,
    );
    expect(sameWebsite("acme.co.th", "app.acme.co.th")).toBe(false);
    expect(sameWebsite("acme.co.th", "acme.com")).toBe(false);
  });
  it("never matches a missing link", () => {
    expect(sameWebsite(null, "acme.co.th")).toBe(false);
    expect(sameWebsite("", "")).toBe(false);
  });
});

// UX master audit A1.2: platform pages, short links and the type the founder can correct.
describe("linkPlatform / isOwnWebsite", () => {
  it.each([
    ["https://www.facebook.com/mypage", "facebook"],
    ["https://m.facebook.com/mypage", "facebook"],
    ["https://web.facebook.com/profile.php?id=1", "facebook"],
    ["fb.me/mypage", "facebook"],
    ["https://www.youtube.com/@chan", "youtube"],
    ["https://youtu.be/abc", "youtube"],
    ["https://www.tiktok.com/@shop", "tiktok"],
    ["https://linktr.ee/me", "linktree"],
    ["https://x.com/me", "x"],
    ["https://twitter.com/me", "x"],
    ["https://instagram.com/me", "instagram"],
    ["https://www.linkedin.com/company/x", "linkedin"],
    ["https://me.notion.site/Page-1", "notion"],
    ["https://docs.google.com/document/d/1", "google_docs"],
    ["https://sites.google.com/view/x", "google_sites"],
    ["https://testflight.apple.com/join/abc", "testflight"],
    ["https://liff.line.me/123-abc", "line_liff"],
  ])("%s → %s, not an own website", (url, platform) => {
    expect(linkPlatform(url)).toBe(platform);
    expect(isOwnWebsite(url)).toBe(false);
    expect(ownWebsiteHost(url)).toBe(null);
  });
  it("own websites stay own websites (incl. look-alikes and github.io)", () => {
    for (const url of [
      "https://mysaas.ai",
      "notfacebook.com",
      "facebook.com.evil.example",
      "https://you.github.io/app",
      "https://shop.co.th/th",
    ]) {
      expect(linkPlatform(url)).toBe(null);
      expect(isOwnWebsite(url)).toBe(true);
    }
    expect(ownWebsiteHost("https://www.MySaaS.ai/x")).toBe("mysaas.ai");
  });
  it("store, LINE and GitHub links are not websites at all", () => {
    expect(isOwnWebsite("https://github.com/me/r")).toBe(false);
    expect(isOwnWebsite("@shop")).toBe(false);
    expect(isOwnWebsite(null)).toBe(false);
  });
});

describe("checkProjectLink", () => {
  it("detects a platform page as 'other', stored in the website column", () => {
    const r = checkProjectLink("facebook.com/mypage");
    expect(r).toMatchObject({
      ok: true,
      kind: "website",
      column: "website_url",
      platform: "facebook",
      detected: "other",
      url: "https://facebook.com/mypage",
    });
  });
  it("refuses short links (the destination is hidden)", () => {
    expect(checkProjectLink("https://bit.ly/abc")).toMatchObject({
      ok: false,
      problem: "short_link",
    });
    expect(parseProjectLink("bit.ly/abc")).toBe(null);
  });
  it("won't call a platform page the project's own website", () => {
    expect(
      checkProjectLink("https://facebook.com/mypage", "website"),
    ).toMatchObject({
      ok: false,
      problem: "not_own_site",
      platform: "facebook",
    });
  });
  it("'other' for an unknown domain can't be stored as a platform page", () => {
    expect(checkProjectLink("https://mysaas.ai", "other")).toMatchObject({
      ok: false,
      problem: "unknown_platform",
      detected: "website",
    });
  });
  it("'other' on a supported link keeps its real kind", () => {
    expect(checkProjectLink("lin.ee/abc", "other")).toMatchObject({
      ok: true,
      kind: "line",
    });
  });
  it("a correction to a kind the link doesn't fit is an error for that kind", () => {
    expect(checkProjectLink("https://mysaas.ai", "line")).toMatchObject({
      ok: false,
      problem: "invalid",
      expected: "line",
    });
    expect(
      checkProjectLink("https://play.google.com/store/search?q=x"),
    ).toMatchObject({ ok: false, problem: "invalid", expected: "play_store" });
  });
  it("keeps paths and query strings (except GitHub, trimmed to owner/repo)", () => {
    expect(checkProjectLink("shop.co.th/p/1?ref=fb&lang=th")).toMatchObject({
      ok: true,
      url: "https://shop.co.th/p/1?ref=fb&lang=th",
    });
    expect(
      checkProjectLink(
        "https://play.google.com/store/apps/details?id=a.b&hl=th",
      ),
    ).toMatchObject({
      ok: true,
      url: "https://play.google.com/store/apps/details?id=a.b&hl=th",
    });
    expect(
      checkProjectLink("https://www.youtube.com/watch?v=xyz"),
    ).toMatchObject({ ok: true, url: "https://www.youtube.com/watch?v=xyz" });
  });
  it("a LINE ID stays LINE; empty input is null", () => {
    expect(checkProjectLink("@calbot")).toMatchObject({
      ok: true,
      kind: "line",
      detected: "line",
    });
    expect(checkProjectLink("   ")).toBe(null);
  });
});

describe("sameWebsite for platform pages", () => {
  it("two different pages on the same platform are different projects", () => {
    expect(sameWebsite("facebook.com/shop-a", "facebook.com/shop-b")).toBe(
      false,
    );
    expect(
      sameWebsite(
        "https://www.facebook.com/profile.php?id=1",
        "https://www.facebook.com/profile.php?id=2",
      ),
    ).toBe(false);
    expect(
      sameWebsite("youtube.com/watch?v=a", "https://youtube.com/watch?v=b"),
    ).toBe(false);
    expect(sameWebsite("facebook.com", "facebook.com/shop-a")).toBe(false);
  });
  it("the same page matches across www / m. / case / trailing slash / tracking params", () => {
    expect(
      sameWebsite(
        "https://m.facebook.com/Shop-A/?fbclid=xyz",
        "https://www.facebook.com/shop-a",
      ),
    ).toBe(true);
    expect(
      sameWebsite(
        "https://www.youtube.com/watch?v=a&si=123",
        "https://youtube.com/watch?v=a",
      ),
    ).toBe(true);
  });
  it("a platform page never matches an own website or another platform", () => {
    expect(sameWebsite("facebook.com/shop", "shop.co.th")).toBe(false);
    expect(sameWebsite("tiktok.com/@shop", "instagram.com/shop")).toBe(false);
  });
});
