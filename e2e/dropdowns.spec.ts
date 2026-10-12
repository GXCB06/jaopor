import { expect, test, type Locator, type Page } from "@playwright/test";

// Design.md §5 Dropdowns (owner report 2026-10-11: the filter list opened upward, past the
// screen edge, and allowed one choice only). Every list opens BELOW its trigger, stays inside
// the screen, and the directory filters take several values.

async function expectBelowAndOnScreen(
  page: Page,
  trigger: Locator,
  list: Locator,
) {
  await expect(list).toBeVisible();
  const t = (await trigger.boundingBox())!;
  const l = (await list.boundingBox())!;
  const vh = page.viewportSize()!.height;
  expect(l.y, "list starts under the trigger").toBeGreaterThanOrEqual(
    t.y + t.height - 1,
  );
  expect(l.y + l.height, "list ends inside the screen").toBeLessThanOrEqual(
    vh + 1,
  );
  expect(l.x).toBeGreaterThanOrEqual(-1);
  expect(l.x + l.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
}

test("directory filters: several categories at once, list opens below and fits", async ({
  page,
}) => {
  await page.goto("/th/startups");
  const toggle = page.locator('label[for="filters-toggle"]');
  if (await toggle.isVisible()) await toggle.click();
  const form = page.locator('form[action$="/startups"]');

  // The province trigger sits low in the panel: the page makes room instead of flipping up.
  const province = form.getByRole("button", { name: /จังหวัด/ });
  await province.click();
  await expectBelowAndOnScreen(page, province, page.getByRole("dialog"));
  await page.keyboard.press("Escape");

  const category = form.getByRole("button", { name: /หมวดหมู่/ });
  await category.click();
  const list = page.getByRole("dialog");
  await expectBelowAndOnScreen(page, category, list);
  await list.getByRole("checkbox", { name: "SaaS" }).check();
  await list.getByRole("checkbox", { name: "ฟินเทค" }).check();
  await expect(list).toContainText("เลือก 2 รายการ");
  await list.getByRole("button", { name: "เสร็จ" }).click();
  await expect(category).toContainText("SaaS +1");

  await form.getByRole("button", { name: "ใช้ตัวกรอง" }).click();
  await page.waitForURL(/category=saas(%2C|,)fintech/);
  // Reloaded with both values kept.
  await expect(
    page.locator('form[action$="/startups"] input[name="category"]'),
  ).toHaveValue("saas,fintech");
});

// The Olympics province picker: always on the page, and its 77 options need the room below. (The
// home leaderboard's list was used before; that board now opens only at 3 rankable projects.)
const provincePicker = (page: import("@playwright/test").Page) =>
  // CSS, not role: an open Radix Select hides the rest of the page from the a11y tree.
  page.locator('main button[role="combobox"]').first();

test("the province list opens below its button", async ({ page }) => {
  await page.goto("/th/olympics");
  const trigger = provincePicker(page);
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click();
  await expectBelowAndOnScreen(page, trigger, page.getByRole("listbox"));
});

test("a dropdown near the bottom of the screen still opens below (the page makes room)", async ({
  page,
}) => {
  await page.goto("/th/olympics");
  const trigger = provincePicker(page);
  // Put the button 60 px above the bottom edge and click at once (mid scroll-reveal).
  await trigger.evaluate((el) => {
    const r = el.getBoundingClientRect();
    window.scrollBy({
      top: r.bottom - (window.innerHeight - 60),
      behavior: "instant",
    });
  });
  await trigger.click();
  await expectBelowAndOnScreen(page, trigger, page.getByRole("listbox"));
});
