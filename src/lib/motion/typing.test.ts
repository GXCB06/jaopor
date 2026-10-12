import { describe, expect, it } from "vitest";
import { gradientAt, plainText, typedGlyphs } from "./typing";

describe("typedGlyphs", () => {
  it("keeps Thai marks on their letter and numbers glyphs across tags", () => {
    const g = typedGlyphs("ดูผลงานจริง <brand>ตัวเลขจริง</brand>", 5);
    expect(g.map((x) => x.ch).join("")).toBe("ดูผลงานจริง ตัวเลขจริง");
    expect(g[0]).toEqual({ ch: "ดู", i: 5 });
    const brand = g.filter((x) => x.tag === "brand");
    expect(brand.map((x) => x.ch)).toEqual(["ตั", "ว", "เ", "ล", "ข", "จ", "ริ", "ง"]);
    expect(brand[0].at).toBe(0);
    expect(brand.at(-1)?.at).toBe(1);
    expect(g.at(-1)?.i).toBe(5 + g.length - 1);
  });

  it("plain text drops the markup", () => {
    expect(plainText("1 คน <muted>+</muted> 1 Startup")).toBe("1 คน + 1 Startup");
  });
});

describe("gradientAt", () => {
  it("runs from → via → to", () => {
    expect(gradientAt(0)).toContain("var(--hero-grad-via) 0%");
    expect(gradientAt(0.55)).toContain("var(--hero-grad-via) 100%");
    expect(gradientAt(1)).toContain("var(--hero-grad-to) 100%");
  });
});
