import { expect, test, type Page } from "@playwright/test";

// Design.md §7 Motion (M1): verified numbers roll in once when seen, the chart draws in, and
// nothing moves for visitors who ask for reduced motion. The real value is always in the DOM.

const MOTION =
  /^(roll-digit|motion-hide|motion-show|chart-draw|chart-hidden|live-beat)$/;

/** First listed project page that has `selector` (a rolling number by default), or null. */
async function projectWith(
  page: Page,
  selector = "[data-inview] .roll-d",
): Promise<string | null> {
  await page.goto("/th/startups");
  const hrefs = await page
    .locator('main a[href*="/startup/"]')
    .evaluateAll((as) => [
      ...new Set(as.map((a) => a.getAttribute("href")).filter(Boolean)),
    ]);
  for (const href of hrefs.slice(0, 8) as string[]) {
    await page.goto(href);
    // Charts mount on the client after load, so give the selector a moment to appear.
    const found = await page
      .locator(selector)
      .first()
      .waitFor({ state: "attached", timeout: 4_000 })
      .then(() => true)
      .catch(() => false);
    if (found) return href;
  }
  return null;
}

test("a rolling number reads exactly its value and rolls once when seen", async ({
  page,
}) => {
  const href = await projectWith(page);
  test.skip(!href, "no project with a verified or counted number");
  const tile = page
    .locator("[data-inview]", { has: page.locator(".roll-d") })
    .first();
  const text = (await tile.textContent()) ?? "";
  // The 0–9 column is CSS-generated: never part of the text people copy or tools read.
  expect(text).toMatch(/\d/);
  expect(text).not.toContain("0123456789");

  await tile.scrollIntoViewIfNeeded();
  await expect(tile).toHaveAttribute("data-in", "done", { timeout: 5_000 });
  await expect(tile).toHaveText(text);
  await expect(tile.locator(".roll-v").first()).toHaveCSS("opacity", "1");

  // Replaying the first view starts both halves of the effect: the column and the digit hold.
  const names = await tile.evaluate(async (el) => {
    el.removeAttribute("data-in");
    el.getBoundingClientRect();
    el.setAttribute("data-in", "1");
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    return document
      .getAnimations()
      .filter((a) => {
        const target = (a.effect as KeyframeEffect | null)?.target;
        return target instanceof Element && el.contains(target);
      })
      .map((a) => (a as CSSAnimation).animationName);
  });
  expect(names).toContain("roll-digit");
  expect(names).toContain("motion-hide");
});

test("the chart draws in and ends fully visible", async ({ page }) => {
  const href = await projectWith(page, "[data-inview] .recharts-area");
  test.skip(!href, "no project with a chart");
  const plot = page.locator("[data-inview]", {
    has: page.locator(".recharts-area"),
  });
  await plot.first().scrollIntoViewIfNeeded();
  await expect(plot.first()).toHaveAttribute("data-in", "done", {
    timeout: 5_000,
  });
  const clip = await plot
    .first()
    .locator(".recharts-area")
    .first()
    .evaluate((g) => getComputedStyle(g).clipPath);
  expect(clip).not.toContain("100%");
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("nothing rolls, draws or pulses, and values show at once", async ({
    page,
  }) => {
    const href = await projectWith(page);
    test.skip(!href, "no project with numbers");
    const tiles = page.locator("[data-inview]");
    // InView settles immediately for reduced motion: no start state, no failsafe wait.
    await expect(tiles.first()).toHaveAttribute("data-in", "done");
    await page.mouse.wheel(0, 1500);
    const moving = await page.evaluate((src) => {
      const re = new RegExp(src);
      return document
        .getAnimations()
        .map((a) => (a as CSSAnimation).animationName)
        .filter((n) => n && re.test(n));
    }, MOTION.source);
    expect(moving).toEqual([]);
    await expect(page.locator(".roll-v").first()).toHaveCSS("opacity", "1");
  });
});
