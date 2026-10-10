import { expect, test } from "@playwright/test";
import { expectNoHorizontalScroll, firstLink, openPage } from "./helpers";
import en from "../messages/en.json";
import th from "../messages/th.json";

// UX master audit B1.3 (item 6): the project page groups evidence into a "Proof" container and the
// narrative into a "Story" container, Proof first. Project pages render from public data, so this
// runs everywhere (no server key needed), like readability.spec.ts.

const T = {
  th: {
    proof: th.Profile.proofTitle,
    story: th.Profile.storyTitle,
    updates: th.Profile.latestUpdates,
  },
  en: {
    proof: en.Profile.proofTitle,
    story: en.Profile.storyTitle,
    updates: en.Profile.latestUpdates,
  },
};

for (const locale of ["th", "en"] as const) {
  test(`/${locale} project page: Proof, then Story, then updates`, async ({
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
    const proof = heads.indexOf(m.proof);
    const story = heads.indexOf(m.story);
    const updates = heads.indexOf(m.updates);

    expect(proof, `"${m.proof}" heading`).toBeGreaterThanOrEqual(0);
    if (story !== -1) expect(proof, "Proof before Story").toBeLessThan(story);
    if (updates !== -1) {
      expect(proof, "Proof before updates").toBeLessThan(updates);
      if (story !== -1)
        expect(story, "Story before updates").toBeLessThan(updates);
    }
    await expectNoHorizontalScroll(page, path);
  });
}
