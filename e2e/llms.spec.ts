import { expect, test } from "@playwright/test";

// Design.md §4 SEO / launch-plan §Should-have: `llms.txt` and a Markdown twin of every public
// profile. Machine endpoints, so these hit the URLs directly (no browser needed).

test("llms.txt is plain text and indexes the projects", async ({ request }) => {
  const res = await request.get("/llms.txt");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("text/plain");
  const body = await res.text();
  expect(body).toContain("# JaoPor");
  expect(body).toContain("/startup/");
});

test("a listed project has a working Markdown twin", async ({ request }) => {
  const index = await (await request.get("/llms.txt")).text();
  const mdUrl = index.match(
    /\((https?:\/\/[^)]+\/(?:th|en)\/startup\/[^)]+\/md)\)/,
  )?.[1];
  test.skip(!mdUrl, "no public projects to check");

  const res = await request.get(mdUrl!);
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("text/markdown");
  const body = await res.text();
  expect(body.startsWith("# ")).toBe(true);
  expect(body).toContain("/startup/");

  // Accept: text/markdown on the human URL returns the same twin.
  const htmlUrl = mdUrl!.replace(/\/md$/, "");
  const negotiated = await request.get(htmlUrl, {
    headers: { Accept: "text/markdown" },
  });
  expect(negotiated.status()).toBe(200);
  expect(negotiated.headers()["content-type"]).toContain("text/markdown");
  expect(await negotiated.text()).toBe(body);
});
