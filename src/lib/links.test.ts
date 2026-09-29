import { describe, expect, it } from "vitest";
import {
  detectLinkKind,
  normalizeUrl,
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
