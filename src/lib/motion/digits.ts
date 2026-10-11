// Design.md §7 Motion — RollingNumber: split an already-formatted value into the parts that roll
// (ASCII digits) and the parts that stay still (currency symbols, separators, letters, words).

export type RollPart =
  | { kind: "digit"; char: string; d: number; i: number }
  | { kind: "text"; text: string };

/**
 * "฿12,400" → text "฿", digits 1 2, text ",", digits 4 0 0. `d` is the digit's value (where the 0–9
 * column stops), `i` its position among the digits only (the stagger order, left to right).
 * Joining every part's char / text gives back the input exactly.
 */
export function splitDigits(text: string): RollPart[] {
  const parts: RollPart[] = [];
  let i = 0;
  for (const char of text) {
    if (char >= "0" && char <= "9") {
      parts.push({ kind: "digit", char, d: char.charCodeAt(0) - 48, i: i++ });
      continue;
    }
    const last = parts.at(-1);
    if (last?.kind === "text") last.text += char;
    else parts.push({ kind: "text", text: char });
  }
  return parts;
}
