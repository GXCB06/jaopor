import { gradientAt, plainText, typedGlyphs, type Glyph } from "@/lib/motion/typing";
import { cn } from "@/lib/utils";

// Design.md §5 Hero (owner request 2026-10-12): the home H1 types itself in, one glyph after
// another with a caret, CSS only (globals.css .type-glyph). The text is in the HTML from the first
// byte; screen readers get it whole from the sr-only copy. Back / Forward and reduced motion show
// it at once.

/** Pause between the two lines, in glyph steps. */
const LINE_PAUSE = 4;

export function TypedHeadline({ top, bottom }: { top: string; bottom: string }) {
  const first = typedGlyphs(top);
  const second = typedGlyphs(bottom, first.length + LINE_PAUSE);
  const lastI = second.at(-1)?.i ?? first.at(-1)?.i;

  const glyph = (g: Glyph) => (
    <span
      key={g.i}
      className={cn(
        "type-glyph",
        g.i === lastI && "type-last",
        g.tag === "muted" && "text-muted-foreground",
      )}
      style={
        {
          "--i": g.i,
          ...(g.tag === "brand" ? { color: gradientAt(g.at ?? 0) } : {}),
        } as React.CSSProperties
      }
    >
      {g.ch}
    </span>
  );

  return (
    <h1 className="mb-4 font-bold tracking-tight text-balance">
      <span className="sr-only">{`${plainText(top)} ${plainText(bottom)}`}</span>
      <span
        aria-hidden="true"
        className="block text-[1.75rem] leading-[1.15] sm:text-5xl md:text-6xl"
      >
        {first.map(glyph)}
      </span>
      <span
        aria-hidden="true"
        className="mt-2 block text-2xl leading-tight sm:text-3xl md:text-4xl"
      >
        {second.map(glyph)}
      </span>
    </h1>
  );
}
