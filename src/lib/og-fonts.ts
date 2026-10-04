// Fonts for the next/og renderers (OG cards, share cards). Vendored in src/assets/fonts (OFL).
//
// The renderer keeps ONE file per family name and weight: with the Latin and Thai subsets of
// IBM Plex Sans Thai registered under the same name, the Latin file always wins, so Thai text and
// "฿" (U+0E3F, only in the Thai subset) never reach Plex Thai: "฿" was drawn as a missing-glyph
// box and Thai fell back to a font fetched at render time. Each subset therefore gets its own
// family, and every text style lists the Thai one second so it covers what the first lacks.
import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ImageResponse } from "next/og";

type OgFont = NonNullable<
  NonNullable<ConstructorParameters<typeof ImageResponse>[1]>["fonts"]
>[number];

/** Body text: IBM Plex Sans Thai, Latin subset first, Thai subset for Thai and "฿". */
export const OG_SANS = "Plex, PlexThai";
/** Numbers: Inconsolata (Latin only); "฿" comes from the Thai subset. */
export const OG_MONO = "Mono, PlexThai";

const font = (file: string) =>
  readFile(join(process.cwd(), "src/assets/fonts", file));

export async function ogFonts(): Promise<OgFont[]> {
  const [latin, latinBold, thai, thaiBold, mono] = await Promise.all([
    font("ibm-plex-sans-thai-latin-400-normal.woff"),
    font("ibm-plex-sans-thai-latin-700-normal.woff"),
    font("ibm-plex-sans-thai-thai-400-normal.woff"),
    font("ibm-plex-sans-thai-thai-700-normal.woff"),
    font("inconsolata-latin-700-normal.woff"),
  ]);
  return [
    { name: "Plex", data: latin, weight: 400, style: "normal" },
    { name: "Plex", data: latinBold, weight: 700, style: "normal" },
    { name: "PlexThai", data: thai, weight: 400, style: "normal" },
    { name: "PlexThai", data: thaiBold, weight: 700, style: "normal" },
    { name: "Mono", data: mono, weight: 700, style: "normal" },
  ];
}
