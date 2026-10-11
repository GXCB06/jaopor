import { describe, expect, it } from "vitest";
import {
  POPULAR_PROVINCES,
  PROVINCE_ALIASES,
  isProvince,
} from "@/lib/config/provinces";
import { normalizeSearch } from "@/lib/search-text";
import { categoryOptions, provinceOptions } from "./vocab-options";

// The combobox matches `${label} ${keywords} ${value}` after normalizeSearch (VocabCombobox).
const find = (locale: string, typed: string) => {
  const q = normalizeSearch(typed);
  return provinceOptions(locale)
    .filter((o) =>
      normalizeSearch(`${o.label} ${o.keywords ?? ""} ${o.value}`).includes(q),
    )
    .map((o) => o.value);
};

describe("province picker search (first-user test: people couldn't find theirs)", () => {
  it("every alias and popular entry is a real province", () => {
    for (const slug of [...Object.keys(PROVINCE_ALIASES), ...POPULAR_PROVINCES])
      expect(isProvince(slug), slug).toBe(true);
  });

  it.each([
    ["กทม", "bangkok"],
    ["bkk", "bangkok"],
    ["Bangkok", "bangkok"],
    ["กรุงเทพ", "bangkok"],
    ["โคราช", "nakhon-ratchasima"],
    ["korat", "nakhon-ratchasima"],
    ["หาดใหญ่", "songkhla"],
    ["pattaya", "chonburi"],
    ["เชียงใหม่", "chiang-mai"],
    ["chiang mai", "chiang-mai"],
  ])("“%s” finds %s in both languages", (typed, slug) => {
    expect(find("th", typed)).toContain(slug);
    expect(find("en", typed)).toContain(slug);
  });

  it("still lists all 77 provinces", () => {
    expect(provinceOptions("th")).toHaveLength(77);
  });
});

describe("categoryOptions (owner request 2026-10-11: type to find a category)", () => {
  const hits = (locale: string, typed: string) => {
    const q = normalizeSearch(typed);
    return categoryOptions(locale)
      .filter((o) =>
        normalizeSearch(`${o.label} ${o.keywords ?? ""} ${o.value}`).includes(
          q,
        ),
      )
      .map((o) => o.value);
  };

  it("every category has an icon and Thai / English names to match", () => {
    for (const o of categoryOptions("th")) {
      expect(o.lucideIcon).toBeTruthy();
      expect(o.keywords).toBeTruthy();
    }
  });

  it.each([
    ["เกม", "games"],
    ["ร้านค้า", "ecommerce"],
    ["บัญชี", "fintech"],
    ["เรียน", "education"],
    ["ไลน์", "line-oa"],
    ["chatbot", "ai"],
    ["hotel", "travel"],
  ])("“%s” finds %s", (typed, slug) => {
    expect(hits("th", typed)).toContain(slug);
    expect(hits("en", typed)).toContain(slug);
  });
});
