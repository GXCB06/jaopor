import { describe, expect, it } from "vitest";
import { splitDigits, type RollPart } from "./digits";

const join = (parts: RollPart[]) =>
  parts.map((p) => (p.kind === "digit" ? p.char : p.text)).join("");

describe("splitDigits", () => {
  it("keeps symbols and separators still and numbers the digits left to right", () => {
    expect(splitDigits("฿12,400")).toEqual([
      { kind: "text", text: "฿" },
      { kind: "digit", char: "1", d: 1, i: 0 },
      { kind: "digit", char: "2", d: 2, i: 1 },
      { kind: "text", text: "," },
      { kind: "digit", char: "4", d: 4, i: 2 },
      { kind: "digit", char: "0", d: 0, i: 3 },
      { kind: "digit", char: "0", d: 0, i: 4 },
    ]);
  });

  it("merges a run of non-digits into one still part", () => {
    expect(splitDigits("48 commits")).toEqual([
      { kind: "digit", char: "4", d: 4, i: 0 },
      { kind: "digit", char: "8", d: 8, i: 1 },
      { kind: "text", text: " commits" },
    ]);
  });

  it("round-trips any formatted value exactly", () => {
    for (const s of [
      "$1.2k",
      "฿1,234,567",
      "1,204 ครั้ง",
      "+18%",
      "",
      "MRR",
      "0",
    ])
      expect(join(splitDigits(s))).toBe(s);
  });

  it("rolls only ASCII digits (Thai digits and other scripts stay still)", () => {
    expect(splitDigits("๑๒").every((p) => p.kind === "text")).toBe(true);
  });

  it("returns nothing for an empty value", () => {
    expect(splitDigits("")).toEqual([]);
  });
});
