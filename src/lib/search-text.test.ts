import { describe, expect, it } from "vitest";
import {
  highlightParts,
  normalizeSearch,
  searchCategories,
  searchProvinces,
} from "./search-text";

describe("QuickSearch vocab matching (spec 6.8)", () => {
  it("ignores Thai tone marks, case and punctuation", () => {
    expect(normalizeSearch("เชียงใหม่")).toBe(normalizeSearch("เชียงใหม"));
    expect(normalizeSearch("Next.js")).toBe("nextjs");
  });

  it("finds categories in both languages and by slug", () => {
    expect(searchCategories("saa", "th")[0]).toMatchObject({ slug: "saas" });
    expect(searchCategories("การตลาด", "en")[0]).toMatchObject({
      slug: "marketing",
      label: "Marketing",
    });
    expect(searchCategories("line", "th").map((c) => c.slug)).toContain(
      "line-oa",
    );
    expect(searchCategories("", "th")).toEqual([]);
  });

  it("finds provinces by Thai name, English name or slug, with the region", () => {
    expect(searchProvinces("mukda", "th")[0]).toEqual({
      slug: "mukdahan",
      label: "มุกดาหาร",
      sub: "ภาคตะวันออกเฉียงเหนือ",
    });
    expect(searchProvinces("เชียงใหม", "en")[0]).toMatchObject({
      slug: "chiang-mai",
      label: "Chiang Mai",
    });
    // Exact and prefix matches rank before substring matches.
    expect(searchProvinces("nan", "en")[0].slug).toBe("nan");
  });

  it("splits text for highlighting", () => {
    expect(highlightParts("เจ้าพ่อ", "พ่อ")).toEqual([
      { text: "เจ้า", match: false },
      { text: "พ่อ", match: true },
    ]);
    expect(highlightParts("RaanDee POS", "pos")).toEqual([
      { text: "RaanDee ", match: false },
      { text: "POS", match: true },
    ]);
    expect(highlightParts("JaoPor", "xyz")).toEqual([
      { text: "JaoPor", match: false },
    ]);
  });
});
