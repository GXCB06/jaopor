import { describe, expect, it } from "vitest";
import { keywordCategory, resolveCategory } from "./category-suggest";

describe("keywordCategory", () => {
  it.each([
    ["Muenidee (มื้อนี้ดี) — ร้านอาหารใกล้คุณ สั่งอาหารง่าย ๆ", "food"],
    ["Debt Tracker: แอปจดหนี้ วางแผนการเงิน", "fintech"],
    ["TomeRoom — เกมแต่งห้องสมุดสำหรับคนรักหนังสือ", "games"],
    ["คอร์สเรียนออนไลน์ ติวสอบ", "education"],
    ["Book hotels and plan your trip", "travel"],
  ])("%s → %s", (text, slug) => {
    expect(keywordCategory(text)).toBe(slug);
  });

  it("no clear signal → null (the founder picks)", () => {
    expect(keywordCategory("Hello world")).toBeNull();
    expect(keywordCategory("")).toBeNull();
  });
});

describe("resolveCategory (wizard auto-select, Issue 2)", () => {
  it("preselects a confident suggestion when nothing is chosen yet", () => {
    expect(resolveCategory("", "saas", false)).toBe("saas");
  });

  it("an ambiguous / invalid suggestion (null) leaves the field unselected", () => {
    expect(resolveCategory("", null, false)).toBe("");
  });

  it("never overwrites a category the founder chose", () => {
    expect(resolveCategory("games", "saas", true)).toBe("games");
  });

  it("an async preview that lands after a manual choice doesn't override it", () => {
    // founder picked "games" while the preview was still reading; it resolves to "saas".
    expect(resolveCategory("games", "saas", true)).toBe("games");
  });

  it("a later preview can re-fill an auto-selected (not manually chosen) value", () => {
    expect(resolveCategory("food", "fintech", false)).toBe("fintech");
  });

  it("no suggestion keeps the current auto-selected value", () => {
    expect(resolveCategory("food", null, false)).toBe("food");
  });
});
