import { expect, test } from "@playwright/test";
import { firstLink } from "./helpers";

// The site's promise is the numbers: they must be readable everywhere.

test("home card numbers are never cut off", async ({ page }) => {
  await page.goto("/th");
  const cut = await page.evaluate(() =>
    [...document.querySelectorAll("article p.tabular-nums")]
      .filter((p) => (p as HTMLElement).offsetParent !== null) // skip cards hidden at this width
      .filter((p) => {
        const el = p as HTMLElement;
        const card = el.closest("article")!.getBoundingClientRect();
        const r = el.getBoundingClientRect();
        return el.scrollWidth > el.clientWidth + 1 || r.right > card.right;
      })
      .map((p) => p.textContent),
  );
  expect(cut).toEqual([]);
});

test("a verified project's tab title shows baht on Thai pages", async ({
  page,
}) => {
  const href = await firstLink(page, "/th/startups", "/th/startup/");
  test.skip(!href, "no projects listed");
  await page.goto(href!);
  const title = await page.title();
  // Verified projects carry "— {MRR} MRR"; on Thai pages it must be in ฿, never $.
  if (/ MRR /.test(title)) expect(title).toMatch(/฿[\d,]+ MRR/);
});

test("the revenue chart's axis uses round steps", async ({ page }) => {
  const href = await firstLink(page, "/th/startups", "/th/startup/");
  test.skip(!href, "no projects listed");
  await page.goto(href!);
  const chart = page.locator(".recharts-wrapper").first();
  test.skip((await chart.count()) === 0, "no chart on this project");
  await chart.scrollIntoViewIfNeeded();
  const ticks = await page.evaluate(() =>
    [...document.querySelectorAll(".recharts-yAxis-tick-labels text")].map(
      (t) => t.textContent ?? "",
    ),
  );
  test.skip(ticks.length < 2, "axis not rendered");
  const values = ticks.map((t) => {
    const n = Number(t.replace(/[^\d.]/g, ""));
    return /k/i.test(t) ? n * 1000 : n;
  });
  const steps = values.slice(1).map((v, i) => v - values[i]);
  // Equal steps of 1 / 2 / 2.5 / 5 × 10ⁿ (not ฿252 / ฿504 / ฿755).
  expect(new Set(steps.map((s) => Math.round(s))).size).toBe(1);
  const mantissa = steps[0] / 10 ** Math.floor(Math.log10(steps[0]));
  expect([1, 2, 2.5, 5]).toContain(Number(mantissa.toFixed(2)));
});
