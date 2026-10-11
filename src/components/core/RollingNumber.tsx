import { splitDigits } from "@/lib/motion/digits";

/**
 * Design.md §7 Motion — RollingNumber: an already-formatted value whose digits roll up to their
 * place on first view (inside an InView). Every real character stays in the DOM, so copy, search,
 * screen readers and tests read exactly `text`; the moving 0–9 column is a `::before` with empty
 * alt text (globals.css `.roll-d`), and the real digit (`.roll-v`) fades in when the column lands.
 * Symbols, separators and words don't move.
 */
export function RollingNumber({ text }: { text: string }) {
  return (
    <span className="roll">
      {splitDigits(text).map((p, k) =>
        p.kind === "text" ? (
          p.text
        ) : (
          <span
            key={k}
            className="roll-d"
            style={{ "--d": p.d, "--i": p.i } as React.CSSProperties}
          >
            <span className="roll-v">{p.char}</span>
          </span>
        ),
      )}
    </span>
  );
}
