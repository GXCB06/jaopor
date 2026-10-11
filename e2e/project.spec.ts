import { expect, test } from "@playwright/test";
import { expectNoHorizontalScroll, firstLink, openPage } from "./helpers";
import en from "../messages/en.json";
import th from "../messages/th.json";

// Project page order (owner request 2026-10-11: back to the layout before the Proof / Story split):
// numbers (chart + "ตัวเลขจากระบบที่เชื่อมต่อ") → screenshots → founder message → ข้อมูลเชิงลึก →
// updates. Project pages render from public data, so this runs everywhere.

const T = {
  th: {
    insights: th.Profile.insights,
    updates: th.Profile.latestUpdates,
    gone: [th.Profile.proofTitle, th.Profile.storyTitle],
  },
  en: {
    insights: en.Profile.insights,
    updates: en.Profile.latestUpdates,
    gone: [en.Profile.proofTitle, en.Profile.storyTitle],
  },
};

for (const locale of ["th", "en"] as const) {
  test(`/${locale} project page: the original order, insights before updates`, async ({
    page,
  }) => {
    const href = await firstLink(
      page,
      `/${locale}/startups`,
      `/${locale}/startup/`,
    );
    test.skip(!href, "no projects listed");
    const path = href!;
    await openPage(page, path);

    const heads = await page.evaluate(() =>
      [...document.querySelectorAll("main h2")].map((h) =>
        (h.textContent ?? "").trim(),
      ),
    );
    const m = T[locale];
    for (const old of m.gone) expect(heads).not.toContain(old);
    const insights = heads.indexOf(m.insights);
    const updates = heads.indexOf(m.updates);
    if (insights !== -1 && updates !== -1)
      expect(insights, "insights before updates").toBeLessThan(updates);
    await expectNoHorizontalScroll(page, path);
  });
}
