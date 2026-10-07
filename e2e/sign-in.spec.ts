import { expect, test } from "@playwright/test";

// Signed out, every gated page sends you to sign-in and remembers exactly where you were
// (Design.md §6 Sign-in routing). Bugs fixed on 2026-10-07: the dashboard layout replaced the
// page with "/dashboard", and some links dropped the language.

const GATED = [
  "/th/new",
  "/en/new",
  "/th/dashboard",
  "/en/dashboard/saved",
  "/th/dashboard/messages",
  "/th/dashboard/123/edit",
];

for (const path of GATED) {
  test(`${path} → sign-in, then back to ${path}`, async ({ page }) => {
    await page.goto(path);
    const locale = path.split("/")[1];
    await page.waitForURL(new RegExp(`/${locale}/login\\?next=`));
    const next = new URL(page.url()).searchParams.get("next");
    expect(next).toBe(path);
  });
}

test("the header's sign-in link remembers the current page", async ({
  page,
}) => {
  await page.goto("/th/startups");
  const href = await page
    .locator('a[href*="/login?next="]')
    .first()
    .getAttribute("href");
  expect(href).not.toBeNull();
  const next = new URL(href!, "https://x.test").searchParams.get("next");
  expect(next).toBe("/th/startups");
});

test("the Add Startup page shows its skeleton, not a blank screen, while it loads", async ({
  page,
}) => {
  // Signed out the page streams the skeleton first, then redirects to sign-in.
  const res = await page.request.get("/th/new");
  expect(res.status()).toBe(200);
  const html = await res.text();
  expect(html).toContain('aria-busy="true"');
  expect(html).toContain("/th/login?next=%2Fth%2Fnew");
});
