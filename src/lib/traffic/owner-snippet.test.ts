import { describe, expect, it } from "vitest";
import { hasOwnerSnippet, sameSite, snippetTag } from "./pixel";

const SITE = "https://jaopor.vercel.app";

describe("hasOwnerSnippet (Owner verified)", () => {
  it("finds the tag we hand out, in <head> or at the end of <body>", () => {
    const tag = snippetTag(SITE, 42);
    expect(hasOwnerSnippet(`<html><head>${tag}</head></html>`, "42")).toBe(
      true,
    );
    // Our own site: relative src, React's defer="", end of body.
    expect(
      hasOwnerSnippet(
        `<body><main></main><script defer="" src="/v.js" data-project="29"></script></body>`,
        "29",
      ),
    ).toBe(true);
    // Attribute order, single quotes, unquoted values, a cache-busting query.
    expect(
      hasOwnerSnippet(
        `<SCRIPT data-project='42' async src=${SITE}/v.js?v=2>`,
        "42",
      ),
    ).toBe(true);
  });

  it("needs this project's id exactly: another project's copied snippet never counts", () => {
    const other = snippetTag(SITE, 421);
    expect(hasOwnerSnippet(other, "42")).toBe(false);
    expect(hasOwnerSnippet(snippetTag(SITE, 4), "42")).toBe(false);
    expect(hasOwnerSnippet(snippetTag(SITE, 42), "421")).toBe(false);
  });

  it("an old slug-based snippet doesn't verify anyone (slugs can be renamed and re-taken)", () => {
    const old = `<script defer src="${SITE}/v.js" data-project="acme"></script>`;
    expect(hasOwnerSnippet(old, "42")).toBe(false);
    expect(hasOwnerSnippet(old, "acme")).toBe(true); // the parser itself is id-agnostic
  });

  it("ignores look-alikes: other scripts, plain text, data-src", () => {
    expect(
      hasOwnerSnippet(
        `<script src="/app.js" data-project="42"></script>`,
        "42",
      ),
    ).toBe(false);
    expect(
      hasOwnerSnippet(
        `<script src="/nav.js" data-project="42"></script>`,
        "42",
      ),
    ).toBe(false);
    expect(hasOwnerSnippet(`<p>src="/v.js" data-project="42"</p>`, "42")).toBe(
      false,
    );
    expect(
      hasOwnerSnippet(`<div data-src="/v.js" data-project="42">`, "42"),
    ).toBe(false);
    expect(hasOwnerSnippet("", "42")).toBe(false);
  });
});

describe("sameSite (the page read must be the listed website)", () => {
  it("accepts the website itself, www and its subdomains", () => {
    expect(sameSite("acme.co.th", "acme.co.th")).toBe(true);
    expect(sameSite("www.acme.co.th", "acme.co.th")).toBe(true);
    expect(sameSite("acme.co.th", "www.acme.co.th")).toBe(true);
    expect(sameSite("app.acme.co.th", "acme.co.th")).toBe(true);
    expect(sameSite("ACME.co.th", "acme.co.th")).toBe(true);
  });
  it("refuses other domains, parents and look-alikes", () => {
    expect(sameSite("evil.com", "acme.co.th")).toBe(false);
    expect(sameSite("vercel.app", "acme.vercel.app")).toBe(false);
    expect(sameSite("notacme.co.th", "acme.co.th")).toBe(false);
    expect(sameSite("acme.co.th.evil.com", "acme.co.th")).toBe(false);
  });
});
