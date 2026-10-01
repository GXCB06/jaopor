import { describe, expect, it } from "vitest";
import { parseOpenGraph } from "./og-parse";

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
