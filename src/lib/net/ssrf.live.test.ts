import { describe, expect, it } from "vitest";
import { fetchHtml, findOwnerSnippet } from "./link-preview";
import { guardedGet } from "./public-url";

// Real-network rejection tests for the SSRF guard (opt-in: LIVE_NET=1 npx vitest run ssrf.live).
// They use public echo servers (httpbin.org) and wildcard DNS (nip.io: 127.0.0.1.nip.io resolves
// to 127.0.0.1), so a public name that points inside is refused at connect time.

const live = !!process.env.LIVE_NET;
const redirectTo = (target: string) =>
  `https://httpbin.org/redirect-to?url=${encodeURIComponent(target)}&status_code=302`;

describe.skipIf(!live)("SSRF guard against the real network", () => {
  it("a public name resolving to 127.0.0.1 is refused", async () => {
    await expect(guardedGet("https://127.0.0.1.nip.io/")).rejects.toThrow(
      /blocked_url/,
    );
  });

  it("a public name resolving to the metadata address is refused", async () => {
    await expect(
      guardedGet("https://169.254.169.254.nip.io/latest/meta-data/"),
    ).rejects.toThrow(/blocked_url/);
  });

  it.each([
    ["an IP literal", "https://127.0.0.1/"],
    ["the metadata IP", "https://169.254.169.254/latest/meta-data/"],
    ["a name that resolves inside", "https://127.0.0.1.nip.io/"],
    ["plain http", "http://example.com/"],
    ["another port", "https://example.com:8443/"],
    ["localhost", "https://localhost/"],
  ])("a public redirect to %s is refused", async (_name, target) => {
    await expect(
      guardedGet(redirectTo(target), { maxRedirects: 3, timeoutMs: 8000 }),
    ).rejects.toThrow(/blocked_url/);
  });

  it("redirect chains stop at the limit", async () => {
    await expect(
      guardedGet("https://httpbin.org/redirect/5", {
        maxRedirects: 3,
        timeoutMs: 8000,
      }),
    ).rejects.toThrow(/redirect_refused/);
  });

  it("no redirects at all when maxRedirects is 0 (provider URLs)", async () => {
    await expect(
      guardedGet(redirectTo("https://example.com/"), { timeoutMs: 8000 }),
    ).rejects.toThrow(/redirect_refused/);
  });

  it("a slow server is cut off at the deadline", async () => {
    const started = Date.now();
    await expect(
      guardedGet("https://httpbin.org/delay/10", { timeoutMs: 2000 }),
    ).rejects.toThrow();
    expect(Date.now() - started).toBeLessThan(5000);
  });

  it("a body larger than the cap errors instead of being read", async () => {
    const { response } = await guardedGet("https://httpbin.org/bytes/300000", {
      maxBytes: 100_000,
      timeoutMs: 8000,
    });
    await expect(response.arrayBuffer()).rejects.toThrow();
  });

  it("a page read stops at its own cap (512 KB) on a huge page", async () => {
    const page = await fetchHtml(
      "https://html.spec.whatwg.org/",
      AbortSignal.timeout(8000),
    );
    expect(page).not.toBeNull();
    expect(page!.html.length).toBeLessThanOrEqual(512 * 1024);
  });

  it("a non-HTML response isn't read as a page", async () => {
    expect(
      await fetchHtml("https://httpbin.org/json", AbortSignal.timeout(8000)),
    ).toBeNull();
  });

  it("owner check: a redirect to another domain is never a match", async () => {
    // httpbin.org redirects to example.com: the page read isn't the listed site.
    expect(
      await findOwnerSnippet(redirectTo("https://example.com/"), "29"),
    ).toBe("missing");
  });

  it("owner check: blocked or unreadable sites are 'unreachable', never 'found'", async () => {
    expect(await findOwnerSnippet("https://127.0.0.1.nip.io/", "29")).toBe(
      "unreachable",
    );
    expect(await findOwnerSnippet("https://169.254.169.254/", "29")).toBe(
      "unreachable",
    );
  });

  it("owner check: our own site carries our snippet only after this change deploys", async () => {
    // Production still renders data-project="jaopor"; the id-based check must not match it.
    expect(await findOwnerSnippet("https://jaopor.vercel.app/th", "29")).toBe(
      "missing",
    );
  });
});
