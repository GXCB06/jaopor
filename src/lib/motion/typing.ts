// Home headline typing (Design.md §5 Hero, owner request 2026-10-12): the message is split into
// grapheme clusters (Thai vowels and tone marks stay on their letter), each with its order in the
// whole headline, so CSS can show them one after another. Pure, for tests.

export type Glyph = {
  /** One grapheme cluster. */
  ch: string;
  /** The rich-text tag it sits in (e.g. "muted", "brand"), if any. */
  tag?: string;
  /** Order across the headline (sets its delay). */
  i: number;
  /** Inside a tag: 0 at its first glyph, 1 at its last (used to colour a gradient by glyph). */
  at?: number;
};

const TAG = /<(\w+)>(.*?)<\/\1>/g;

/** Plain text of a message with simple <tag>…</tag> markup. */
export function plainText(raw: string): string {
  return raw.replace(TAG, "$2");
}

export function typedGlyphs(raw: string, start = 0): Glyph[] {
  const segments: { text: string; tag?: string }[] = [];
  let last = 0;
  for (const m of raw.matchAll(TAG)) {
    if (m.index > last) segments.push({ text: raw.slice(last, m.index) });
    segments.push({ text: m[2], tag: m[1] });
    last = m.index + m[0].length;
  }
  if (last < raw.length) segments.push({ text: raw.slice(last) });

  const split = new Intl.Segmenter("th", { granularity: "grapheme" });
  const out: Glyph[] = [];
  let i = start;
  for (const s of segments) {
    const chars = [...split.segment(s.text)].map((g) => g.segment);
    chars.forEach((ch, k) =>
      out.push({
        ch,
        i: i++,
        ...(s.tag
          ? {
              tag: s.tag,
              at: chars.length > 1 ? k / (chars.length - 1) : 0,
            }
          : {}),
      }),
    );
  }
  return out;
}

/**
 * The colour of the hero gradient (from → via at 55% → to) at `at`, as a CSS color-mix of the
 * gradient tokens, so each typed glyph can carry its own slice of the gradient.
 */
export function gradientAt(at: number): string {
  const p = Math.min(1, Math.max(0, at));
  if (p <= 0.55) {
    const pct = Math.round((p / 0.55) * 100);
    return `color-mix(in oklab, var(--hero-grad-via) ${pct}%, var(--hero-grad-from))`;
  }
  const pct = Math.round(((p - 0.55) / 0.45) * 100);
  return `color-mix(in oklab, var(--hero-grad-to) ${pct}%, var(--hero-grad-via))`;
}
