import { inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { OG_MONO, OG_SANS, ogFonts } from "./og-fonts";

/** Unicode code points mapped by a WOFF font's cmap (formats 4 and 12). */
function codePoints(woff: Buffer): (cp: number) => boolean {
  let cmap: Buffer | null = null;
  for (let i = 0; i < woff.readUInt16BE(12); i++) {
    const o = 44 + i * 20;
    if (woff.toString("latin1", o, o + 4) !== "cmap") continue;
    const off = woff.readUInt32BE(o + 4);
    const comp = woff.readUInt32BE(o + 8);
    const raw = woff.subarray(off, off + comp);
    cmap = comp < woff.readUInt32BE(o + 12) ? inflateSync(raw) : raw;
  }
  if (!cmap) throw new Error("no cmap");
  const t = cmap;
  const ranges: [number, number][] = [];
  for (let i = 0; i < t.readUInt16BE(2); i++) {
    const off = t.readUInt32BE(8 + i * 8);
    const format = t.readUInt16BE(off);
    if (format === 4) {
      const segs = t.readUInt16BE(off + 6) / 2;
      for (let s = 0; s < segs; s++)
        ranges.push([
          t.readUInt16BE(off + 16 + segs * 2 + s * 2),
          t.readUInt16BE(off + 14 + s * 2),
        ]);
    } else if (format === 12) {
      for (let g = 0; g < t.readUInt32BE(off + 12); g++)
        ranges.push([
          t.readUInt32BE(off + 16 + g * 12),
          t.readUInt32BE(off + 20 + g * 12),
        ]);
    }
  }
  return (cp) => ranges.some(([a, b]) => cp >= a && cp <= b);
}

describe("ogFonts", () => {
  it("never registers two files under the same family and weight", async () => {
    // The renderer keeps one file per family + weight: a second one is silently ignored.
    const keys = (await ogFonts()).map((f) => `${f.name}/${f.weight}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it.each([
    ["sans", OG_SANS, [400, 700]],
    ["mono", OG_MONO, [700]],
  ] as const)(
    "%s stack covers ฿, Thai, $ and digits",
    async (_, stack, weights) => {
      const fonts = await ogFonts();
      const families = stack.split(",").map((s) => s.trim());
      for (const family of families)
        expect(fonts.some((f) => f.name === family)).toBe(true);
      for (const weight of weights) {
        const has = fonts
          .filter((f) => families.includes(f.name) && f.weight === weight)
          .map((f) => codePoints(f.data as Buffer));
        for (const ch of ["฿", "ก", "$", "0", "k"])
          expect(has.some((h) => h(ch.codePointAt(0)!))).toBe(true);
      }
    },
  );
});
