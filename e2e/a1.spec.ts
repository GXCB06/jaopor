import { expect, test } from "@playwright/test";
import { expectNoHorizontalScroll } from "./helpers";

// UX master audit phase A1 (signed out): the leaderboard says what it ranks and over which
// period; contact links go through sign-in and come back; the "กำลังหา" box shows real buttons.

const hasServerKey =
  !!process.env.E2E_BASE_URL || !!process.env.SUPABASE_SECRET_KEY;

test("leaderboard labels carry the period and the footer defines the board", async ({
  page,
}) => {
  await page.goto("/th");
  const board = page.locator("#leaderboard");
  await expect(board).toBeVisible();
  const select = board.locator("select");
  for (const label of [
    "MRR ปัจจุบัน",
    "รายได้ 30 วัน",
    "ผู้เข้าชม 30 วัน",
    "Commits ทั้งหมด",
  ])
    await expect(select.locator("option", { hasText: label })).toHaveCount(1);
  // Each board has its own definition line; switching boards switches it.
  await select.selectOption("commits");
  await expect(board).toContainText("Commits ทั้งหมดบน branch หลัก");
  await select.selectOption("visitors");
  await expect(board).toContainText("นับโดยสคริปต์ JaoPor");
  await expectNoHorizontalScroll(page, "/th");
});

test("a contact link sends a signed-out visitor to sign-in and back, same topic", async ({
  page,
}) => {
  test.skip(!hasServerKey, "local run without SUPABASE_SECRET_KEY");
  await page.goto("/th/builders");
  const href = await page
    .locator('main a[href*="/u/"]')
    .first()
    .getAttribute("href")
    .catch(() => null);
  test.skip(!href, "no builders listed");
  const profile = new URL(href!, "https://x.test").pathname;
  await page.goto(`${profile}?contact=1&topic=cofounder`);
  await page.waitForURL(/\/th\/login\?next=/);
  expect(new URL(page.url()).searchParams.get("next")).toBe(
    `${profile}?contact=1&topic=cofounder`,
  );
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "เข้าสู่ระบบเพื่อส่งคำขอคุย",
  );
});

test("the 'looking for' box lists asks as text and its actions as buttons", async ({
  page,
}) => {
  await page.goto("/th/startups");
  const href = await page
    .locator('main a[href*="/startup/"]')
    .first()
    .getAttribute("href")
    .catch(() => null);
  test.skip(!href, "no projects listed");
  await page.goto(href!);
  const box = page.locator("main div", { hasText: /^กำลังหา:/ }).first();
  test.skip(
    (await box.count()) === 0,
    "this project isn't looking for anything",
  );
  // Every action in the box is a link with a visible arrow, never an inert pill.
  const actions = box.locator("a");
  const n = await actions.count();
  for (let i = 0; i < n; i++) await expect(actions.nth(i)).toContainText("›");
  // No contact button ever points at the product's site.
  const contact = box.locator('a[href*="contact=1"]');
  for (let i = 0; i < (await contact.count()); i++)
    await expect(contact.nth(i)).toHaveAttribute(
      "href",
      /\/u\/[^/]+\?contact=1/,
    );
});
