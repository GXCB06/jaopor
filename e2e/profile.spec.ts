import { expect, test } from "@playwright/test";
import { firstLink } from "./helpers";
import en from "../messages/en.json";
import th from "../messages/th.json";

// UX master audit B1.1 (item 9): on phones the founder's proof and products come before the
// sidebar extras, and experience comes before the feed. Profiles read through the service key
// (admin RPC), so this only runs where it is configured (production / CI), like pages.spec.ts.

const hasServerKey =
  !!process.env.E2E_BASE_URL || !!process.env.SUPABASE_SECRET_KEY;

for (const locale of ["th", "en"] as const) {
  const m = locale === "th" ? th.Builder : en.Builder;

  test(`/${locale} founder profile: experience before updates, extras after content on phones`, async ({
    page,
    isMobile,
  }) => {
    test.skip(!hasServerKey, "local run without SUPABASE_SECRET_KEY");
    const href = await firstLink(
      page,
      `/${locale}/builders`,
      `/${locale}/u/`,
    );
    test.skip(!href, "no builders listed");
    await page.goto(href!, { waitUntil: "load" });

    // Item 9: experience comes before the feed in document order.
    const { exp, feed } = await page.evaluate(
      ({ expText, feedText }) => {
        const headings = [...document.querySelectorAll("main h2")].map((h) =>
          (h.textContent ?? "").trim(),
        );
        return {
          exp: headings.indexOf(expText),
          feed: headings.indexOf(feedText),
        };
      },
      { expText: m.experienceTitle, feedText: m.updatesTitle },
    );
    if (exp !== -1 && feed !== -1) expect(exp).toBeLessThan(feed);

    // The extras are the last block of the main column (on phones) and never inside the aside.
    const extras = page.locator("#profile-extras");
    expect(await page.locator("aside #profile-extras").count()).toBe(0);
    expect(
      await extras.evaluate((el) => el === el.parentElement?.lastElementChild),
    ).toBe(true);

    if (isMobile) {
      // Sidebar extras are not shown above the main content; the full list is below it.
      await expect(extras).toBeVisible();
      await expect(page.locator('aside a[href="#profile-extras"]')).toBeVisible();

      // When the founder is looking for someone, the request action is within the first screen.
      const request = page
        .locator("main a", { hasText: m.sendRequest })
        .first();
      if ((await request.count()) > 0) {
        const top = await request.evaluate(
          (el) => el.getBoundingClientRect().top + window.scrollY,
        );
        expect(top).toBeLessThan(812);
      }
    } else {
      // Desktop keeps the extras in the sticky sidebar, not repeated at the bottom.
      await expect(extras).toBeHidden();
    }
  });
}
