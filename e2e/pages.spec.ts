import { test } from "@playwright/test";
import { expectNoHorizontalScroll, firstLink, openPage } from "./helpers";

// Every public page renders in both languages: it answers, shows no raw message keys or next-intl
// errors, uses the Thai year on Thai pages, and never scrolls sideways (desktop and 375 px).

/** Production has the server key; a local dev server only when the test run is given it too. */
const hasServerKey =
  !!process.env.E2E_BASE_URL || !!process.env.SUPABASE_SECRET_KEY;

const PAGES = [
  "",
  "/startups",
  "/startups?sort=newest",
  "/categories",
  "/olympics",
  "/builders",
  "/feed",
  "/security",
  "/privacy",
  "/terms",
  "/login",
];

for (const locale of ["th", "en"]) {
  for (const path of PAGES) {
    test(`/${locale}${path} renders`, async ({ page }) => {
      // The builders directory reads with the server key: locally only when it is configured.
      test.skip(
        path === "/builders" && !hasServerKey,
        "local run without SUPABASE_SECRET_KEY",
      );
      const url = `/${locale}${path}`;
      await openPage(page, url);
      await expectNoHorizontalScroll(page, url);
    });
  }

  test(`/${locale} a project page renders`, async ({ page }) => {
    const href = await firstLink(
      page,
      `/${locale}/startups`,
      `/${locale}/startup/`,
    );
    test.skip(!href, "no projects listed");
    await openPage(page, href!);
    await expectNoHorizontalScroll(page, href!);
  });

  test(`/${locale} a builder profile renders`, async ({ page }) => {
    // Builder profiles read with the server key: locally only when it is configured.
    test.skip(!hasServerKey, "local run without SUPABASE_SECRET_KEY");
    const href = await firstLink(page, `/${locale}/builders`, `/${locale}/u/`);
    test.skip(!href, "no builders listed");
    await openPage(page, href!);
    await expectNoHorizontalScroll(page, href!);
  });
}
