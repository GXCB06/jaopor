import { expect, type Page } from "@playwright/test";
import th from "../messages/th.json";

// Shared checks for every page (Phase 1b e2e).

/** A raw message key on screen ("Sources.jaopor.howTo1") means a message failed to render. */
const RAW_KEY = new RegExp(
  `\\b(?:${Object.keys(th).join("|")})\\.[A-Za-z][\\w.]*\\b`,
);

/** Thai month followed by a Western year ("ตุลาคม 2026"): Thai pages use the Thai year (Design.md §3 Dates). */
const THAI_MONTH_WESTERN_YEAR =
  /(?:มกราคม|กุมภาพันธ์|มีนาคม|เมษายน|พฤษภาคม|มิถุนายน|กรกฎาคม|สิงหาคม|กันยายน|ตุลาคม|พฤศจิกายน|ธันวาคม|ม\.ค\.|ก\.พ\.|มี\.ค\.|เม\.ย\.|พ\.ค\.|มิ\.ย\.|ก\.ค\.|ส\.ค\.|ก\.ย\.|ต\.ค\.|พ\.ย\.|ธ\.ค\.)\s*20[0-9]{2}\b/;

/** Collects next-intl errors and uncaught page errors while a test runs. */
export function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    const text = msg.text();
    if (
      msg.type() === "error" &&
      /IntlError|INVALID_MESSAGE|MISSING_MESSAGE|FORMATTING_ERROR/.test(text)
    )
      errors.push(text.slice(0, 200));
  });
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  return errors;
}

/** Loads a page and checks: it answers, no raw message keys, no next-intl errors. */
export async function openPage(page: Page, path: string) {
  const errors = watchErrors(page);
  const res = await page.goto(path, { waitUntil: "domcontentloaded" });
  expect(res?.status(), `${path} status`).toBeLessThan(400);
  await page.waitForLoadState("load");
  const text = await page.locator("body").innerText();
  expect(
    text.match(RAW_KEY)?.[0] ?? null,
    `${path}: raw message key`,
  ).toBeNull();
  if (path.startsWith("/th"))
    expect(
      text.match(THAI_MONTH_WESTERN_YEAR)?.[0] ?? null,
      `${path}: Western year on a Thai page`,
    ).toBeNull();
  expect(errors, `${path}: console / page errors`).toEqual([]);
  return text;
}

/** No sideways scrolling (Design.md §8). */
export async function expectNoHorizontalScroll(page: Page, path: string) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow, `${path}: horizontal overflow (px)`).toBeLessThanOrEqual(1);
}

/** First link on `listPath` whose href starts with `prefix` (a real project / builder to test). */
export async function firstLink(page: Page, listPath: string, prefix: string) {
  await page.goto(listPath);
  const href = await page
    .locator(`a[href^="${prefix}"]`)
    .first()
    .getAttribute("href");
  return href;
}
