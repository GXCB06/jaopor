import { describe, expect, it } from "vitest";
import {
  appStoreId,
  parseAppStoreLookup,
  parseOpenGraph,
  parsePlayStore,
  parseSiteIdentity,
} from "./og-parse";

describe("parseOpenGraph", () => {
  it("prefers Open Graph tags and resolves a relative image", () => {
    const html = `<html><head>
      <title>Fallback</title>
      <meta property="og:title" content="JaoPor &amp; friends">
      <meta name="description" content="plain description">
      <meta property='og:description' content='OG description'>
      <meta property="og:image" content="/og.png">
    </head><body><meta property="og:title" content="ignored body tag"></body></html>`;
    expect(parseOpenGraph(html, "https://www.jaopor.app/th")).toEqual({
      title: "JaoPor & friends",
      description: "OG description",
      image: "https://www.jaopor.app/og.png",
      domain: "jaopor.app",
    });
  });

  it("falls back to twitter tags, the <title> and the meta description", () => {
    const html = `<head><title> Hello
      world </title><meta name="description" content="desc"></head>`;
    expect(parseOpenGraph(html, "https://example.com/")).toEqual({
      title: "Hello world",
      description: "desc",
      image: null,
      domain: "example.com",
    });
  });

  it("drops non-https images and caps long text", () => {
    const html = `<head><meta property="og:image" content="http://insecure.test/a.png">
      <meta property="og:title" content="${"ก".repeat(200)}"></head>`;
    const p = parseOpenGraph(html, "https://example.com/");
    expect(p.image).toBeNull();
    expect(p.title).toHaveLength(120);
    expect(p.title?.endsWith("…")).toBe(true);
  });

  it("decodes numeric entities", () => {
    const html = `<head><meta property="og:title" content="&#3592;&#x0E49;&#x0E32; it&#39;s"></head>`;
    expect(parseOpenGraph(html, "https://example.com/").title).toBe("จ้า it's");
  });
});

describe("parseSiteIdentity (Add-startup auto-fill)", () => {
  const page = "https://www.acme.co.th/th";

  it("uses the site name tag and the meta description", () => {
    const html = `<head><title>Home | Acme</title>
      <meta property="og:site_name" content="Acme Invoice">
      <meta name="description" content="ออกใบกำกับภาษีใน 1 นาที"></head>`;
    expect(parseSiteIdentity(html, page)).toMatchObject({
      name: "Acme Invoice",
      tagline: "ออกใบกำกับภาษีใน 1 นาที",
    });
  });

  it("picks the title part that matches the domain, the rest becomes the one-liner", () => {
    const html = `<head><title>Invoices in one minute — Acme</title></head>`;
    expect(parseSiteIdentity(html, page)).toMatchObject({
      name: "Acme",
      tagline: "Invoices in one minute",
    });
    // No part matches: the first part is the name, a short rest is not a one-liner.
    expect(
      parseSiteIdentity("<title>Kanom | Home</title>", page),
    ).toMatchObject({ name: "Kanom", tagline: null });
    expect(
      parseSiteIdentity(
        "<title>Acme: รีวิวร้านอาหารและที่พักทั่วไทย</title>",
        page,
      ),
    ).toMatchObject({
      name: "Acme",
      tagline: "รีวิวร้านอาหารและที่พักทั่วไทย",
    });
  });

  it("clips the one-liner to 140 characters", () => {
    const long = "x".repeat(300);
    const html = `<head><title>Acme</title><meta name="description" content="${long}"></head>`;
    expect(parseSiteIdentity(html, page).tagline).toHaveLength(140);
  });

  it("orders icons: apple-touch-icon, then the largest, never .ico or mask-icon", () => {
    const html = `<head>
      <link rel="icon" href="/favicon.ico" sizes="48x48">
      <link rel="shortcut icon" type="image/x-icon" href="/fav">
      <link rel="mask-icon" href="/safari.svg">
      <link rel="icon" type="image/png" sizes="32x32" href="/icon-32.png">
      <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png">
      <link rel="apple-touch-icon" href="https://cdn.acme.co.th/apple.png">
      <link rel="icon" href="http://acme.co.th/insecure.png" sizes="512x512">
    </head>`;
    expect(parseSiteIdentity(html, page).icons).toEqual([
      "https://cdn.acme.co.th/apple.png",
      "https://www.acme.co.th/icon-192.png",
      "https://www.acme.co.th/icon-32.png",
      "https://www.acme.co.th/apple-touch-icon.png",
    ]);
  });

  it("treats an SVG icon as large and always offers the conventional apple-touch-icon", () => {
    const html = `<head><link rel="icon" href="/icon.svg" type="image/svg+xml"></head>`;
    expect(parseSiteIdentity(html, page).icons).toEqual([
      "https://www.acme.co.th/icon.svg",
      "https://www.acme.co.th/apple-touch-icon.png",
    ]);
  });

  it("an empty page gives nothing but the conventional icon", () => {
    expect(parseSiteIdentity("<html></html>", page)).toEqual({
      name: null,
      tagline: null,
      icons: ["https://www.acme.co.th/apple-touch-icon.png"],
    });
  });
});

describe("store links (Add-startup auto-fill)", () => {
  it("reads the numeric app id from an App Store URL", () => {
    expect(appStoreId("https://apps.apple.com/th/app/line/id443904275")).toBe(
      "443904275",
    );
    expect(appStoreId("https://apps.apple.com/app/id123456789?l=en")).toBe(
      "123456789",
    );
    expect(appStoreId("https://apps.apple.com/th/app/line")).toBeNull();
  });

  it("maps Apple's lookup JSON to name, one-liner and icon", () => {
    const json = {
      resultCount: 1,
      results: [
        {
          trackName: "LINE",
          subtitle: "",
          description:
            "LINE is transforming the way people communicate. And a lot more text after that.",
          artworkUrl512: "https://is1-ssl.mzstatic.com/thumb/512x512bb.jpg",
          artworkUrl100: "https://is1-ssl.mzstatic.com/thumb/100x100bb.jpg",
        },
      ],
    };
    expect(parseAppStoreLookup(json)).toEqual({
      name: "LINE",
      // Empty subtitle falls back to the first sentence of the description.
      tagline: "LINE is transforming the way people communicate.",
      icons: [
        "https://is1-ssl.mzstatic.com/thumb/512x512bb.jpg",
        "https://is1-ssl.mzstatic.com/thumb/100x100bb.jpg",
      ],
    });
  });

  it("returns null when the lookup finds nothing usable", () => {
    expect(parseAppStoreLookup({ resultCount: 0, results: [] })).toBeNull();
    expect(parseAppStoreLookup(null)).toBeNull();
    expect(parseAppStoreLookup("nope")).toBeNull();
  });

  it("reads a Play page: trims the store suffix and uses the app icon", () => {
    const html = `<head>
      <meta property="og:title" content="WhatsApp Messenger - Apps on Google Play">
      <meta property="og:description" content="Simple. Reliable. Private.">
      <meta property="og:image" content="https://play-lh.googleusercontent.com/abc=s0-br30">
      <link rel="icon" href="/favicon.ico">
    </head>`;
    expect(
      parsePlayStore(
        html,
        "https://play.google.com/store/apps/details?id=com.whatsapp",
      ),
    ).toEqual({
      name: "WhatsApp Messenger",
      tagline: "Simple. Reliable. Private.",
      icons: ["https://play-lh.googleusercontent.com/abc=s512"],
    });
  });
});
