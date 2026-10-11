import { describe, expect, it } from "vitest";
import { keywordCategory } from "./category-suggest";

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
