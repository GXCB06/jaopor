import { expect, test, type Page } from "@playwright/test";
import { firstLink } from "./helpers";

// Design.md §3 floor (UX audit A3): no visible text under 12px — Thai loses its vowel and tone
// marks below it. Decorative subtrees (aria-hidden) and the live map's scaled SVG text (its own
// documented exception, marked data-live-map) are skipped.

/** Every visible leaf text node inside <main> whose computed font-size is below 12px. */
async function textUnderTwelve(page: Page) {
  return page.evaluate(() => {
    const main = document.querySelector("main");
    if (!main) return [];
    const out: string[] = [];
    for (const el of main.querySelectorAll("*")) {
      if (el.children.length > 0) continue; // leaf text nodes only
      const text = el.textContent?.trim();
      if (!text) continue;
      if (el.closest('[aria-hidden="true"]')) continue;
      if (el.closest("[data-live-map]")) continue;
      const r = (el as HTMLElement).getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const fs = parseFloat(getComputedStyle(el).fontSize);
      if (fs < 11.9) out.push(`${fs.toFixed(1)}px «${text.slice(0, 40)}»`);
    }
    return out;
  });
}

const PAGES = ["", "/startups", "/categories", "/olympics", "/feed", "/login"];

for (const locale of ["th", "en"]) {
  for (const path of PAGES) {
    test(`/${locale}${path}: no text under 12px`, async ({ page }) => {
      await page.goto(`/${locale}${path}`, { waitUntil: "load" });
      test.skip(
        (await page.locator("main").count()) === 0,
        "no <main> on this page",
      );
      expect(await textUnderTwelve(page)).toEqual([]);
    });
  }

  test(`/${locale} a project page: no text under 12px`, async ({ page }) => {
    const href = await firstLink(
      page,
      `/${locale}/startups`,
      `/${locale}/startup/`,
    );
    test.skip(!href, "no projects listed");
    await page.goto(href!, { waitUntil: "load" });
    expect(await textUnderTwelve(page)).toEqual([]);
  });
}
