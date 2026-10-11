import { expect, test, type Page } from "@playwright/test";

// Design.md §7 Motion: sections fade up as they scroll in, the chart draws in, numbers are plain,
// and nothing moves for visitors who ask for reduced motion.

const MOTION = /^(section-rise|card-rise|chart-draw|chart-hidden|live-beat)$/;

/** First listed project page that has `selector`, or null. */
async function projectWith(
  page: Page,
  selector: string,
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

test("sections below the fold fade up once; numbers never animate", async ({
  page,
}) => {
  const href = await projectWith(page, "main section");
  test.skip(!href, "no project page");
  // On screen at load: never touched (nothing hidden for what the visitor already sees).
  const first = page.locator("main section").first();
  await expect(first).not.toHaveAttribute("data-reveal", /.+/);
  const waiting = page.locator('main section[data-reveal="wait"]');
  // ScrollReveal marks sections after hydration.
  await waiting
    .first()
    .waitFor({ state: "attached", timeout: 5_000 })
    .catch(() => {});
  test.skip((await waiting.count()) === 0, "the page fits on one screen");
  // Pin the section by position: a `[data-reveal="wait"]` locator would move on to the next one.
  const index = await page
    .locator("main section")
    .evaluateAll((all) =>
      all.findIndex((el) => el.getAttribute("data-reveal") === "wait"),
    );
  const target = page.locator("main section").nth(index);
  await target.scrollIntoViewIfNeeded();
  await expect(target).toHaveAttribute("data-reveal", "in");
  await expect(target).toHaveCSS("opacity", "1", { timeout: 3_000 });
  // Numbers are plain text: no digit columns anywhere.
  expect(await page.locator(".roll-d").count()).toBe(0);
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

  test("nothing fades, draws or pulses, and every section shows at once", async ({
    page,
  }) => {
    const href = await projectWith(page, "main section");
    test.skip(!href, "no project page");
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
    expect(await page.locator("main [data-reveal]").count()).toBe(0);
  });
});

test("cards on screen at load stay put; cards that scroll in rise once", async ({
  page,
}) => {
  await page.goto("/th/startups");
  const cards = page.locator("article.card-rise");
  const n = await cards.count();
  test.skip(n === 0, "no projects listed");
  // Already on screen when the page loads: settled at once, no effect.
  await expect(cards.first()).toHaveAttribute("data-in", "done");
  await page.evaluate(() => {
    (window as unknown as { __anims: string[] }).__anims = [];
    document.addEventListener("animationstart", (e) =>
      (window as unknown as { __anims: string[] }).__anims.push(
        e.animationName,
      ),
    );
  });
  const last = cards.nth(n - 1);
  const below = await last.evaluate(
    (el) => el.getBoundingClientRect().top > window.innerHeight,
  );
  test.skip(!below, "every card fits on the first screen");
  await last.scrollIntoViewIfNeeded();
  await expect(last).toHaveAttribute("data-in", "done", { timeout: 5_000 });
  await expect(last).toHaveCSS("opacity", "1");
  const anims = await page.evaluate(
    () => (window as unknown as { __anims: string[] }).__anims,
  );
  expect(anims).toContain("card-rise");
});

test("switching the leaderboard slides rows to their new rank", async ({
  page,
}) => {
  await page.goto("/th");
  const board = page.locator("#leaderboard");
  await board.scrollIntoViewIfNeeded();
  const select = board.locator("select");
  const ids = () =>
    board
      .locator("tbody tr[data-id]")
      .evaluateAll((trs) => trs.map((tr) => tr.getAttribute("data-id")));
  const options = await select
    .locator("option")
    .evaluateAll((os) => os.map((o) => (o as HTMLOptionElement).value));
  const before = await ids();
  const current = await select.inputValue();
  const other = options.find((o) => o !== current);
  test.skip(!other, "only one board");
  await select.selectOption(other!);
  const running = await page.evaluate(
    () =>
      document
        .getAnimations()
        .filter((a) =>
          (a.effect as KeyframeEffect | null)?.target?.matches?.("tr[data-id]"),
        ).length,
  );
  const after = await ids();
  // Rows only move when the set or order of rows changes between the two boards.
  if (before.length && after.length && before.join() !== after.join())
    expect(running).toBeGreaterThan(0);
  await expect(board.locator("tbody")).toBeVisible();
});
