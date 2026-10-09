import { expect, test } from "@playwright/test";

// Design.md §5 Not-found and error pages (launch readiness H-4): unknown URLs and missing projects
// answer 404 with a page in the URL's language, inside the normal header, with a way back that keeps
// the language. Before 2026-10-09 Thai pages showed Next's English "This page could not be found".

const CASES = [
  { path: "/th/no-such-page-e2e", title: "ไม่พบหน้านี้", locale: "th" },
  { path: "/en/no/such/page-e2e", title: "Page not found", locale: "en" },
  {
    path: "/th/startup/no-such-project-e2e",
    title: "ไม่พบหน้านี้",
    locale: "th",
  },
  {
    path: "/en/startup/no-such-project-e2e",
    title: "Page not found",
    locale: "en",
  },
];

for (const c of CASES) {
  test(`${c.path} → 404 in ${c.locale} with a way back`, async ({ page }) => {
    const res = await page.goto(c.path);
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(c.title);
    await expect(page.locator("header")).toBeVisible();
    const home = page.locator("main a").first();
    await expect(home).toHaveAttribute("href", `/${c.locale}`);
    await expect(page.locator("main a").nth(1)).toHaveAttribute(
      "href",
      `/${c.locale}/startups`,
    );
  });
}
