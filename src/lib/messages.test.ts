import { describe, expect, it } from "vitest";
import { IntlMessageFormat } from "intl-messageformat";
import en from "../../messages/en.json";
import th from "../../messages/th.json";

// Every UI string, checked with the same ICU parser next-intl uses (intl-messageformat, pinned to
// next-intl's version). Caught in production on 2026-10-06: a literal "</head>" and "<ID>" made
// two messages fail to render, so visitors saw the raw key "Sources.jaopor.howTo1".

type Tree = { [key: string]: unknown };

/** "Namespace.key.sub" → string, for every string leaf (arrays use their index). */
function leaves(node: unknown, path = "", out = new Map<string, string>()) {
  if (typeof node === "string") out.set(path, node);
  else if (Array.isArray(node))
    node.forEach((v, i) => leaves(v, `${path}.${i}`, out));
  else if (node && typeof node === "object")
    for (const [k, v] of Object.entries(node as Tree))
      leaves(v, path ? `${path}.${k}` : k, out);
  return out;
}

/** Argument and tag names used by a message (sorted, unique). */
function names(message: string, locale: string): string[] {
  const found = new Set<string>();
  const walk = (nodes: unknown[]) => {
    for (const n of nodes as {
      type: number;
      value?: string;
      children?: unknown[];
      options?: Record<string, { value: unknown[] }>;
    }[]) {
      // 1 argument, 2 number, 3 date, 4 time, 5 select, 6 plural, 8 tag (pound = 7, literal = 0).
      if (n.type !== 0 && n.type !== 7 && n.value) found.add(n.value);
      if (n.children) walk(n.children);
      if (n.options) for (const o of Object.values(n.options)) walk(o.value);
    }
  };
  walk(new IntlMessageFormat(message, locale).getAst());
  return [...found].sort();
}

const thLeaves = leaves(th);
const enLeaves = leaves(en);

describe("messages", () => {
  it("th and en have exactly the same keys", () => {
    const onlyTh = [...thLeaves.keys()].filter((k) => !enLeaves.has(k));
    const onlyEn = [...enLeaves.keys()].filter((k) => !thLeaves.has(k));
    expect({ onlyTh, onlyEn }).toEqual({ onlyTh: [], onlyEn: [] });
  });

  it.each([
    ["th", thLeaves],
    ["en", enLeaves],
  ] as const)(
    "every %s message parses (no stray < > { } that break rendering)",
    (locale, all) => {
      const broken: string[] = [];
      for (const [key, message] of all) {
        try {
          new IntlMessageFormat(message, locale);
        } catch (err) {
          broken.push(`${key}: ${(err as Error).message}`);
        }
      }
      expect(broken).toEqual([]);
    },
  );

  it("th and en use the same placeholders and tags in every message", () => {
    const mismatched: string[] = [];
    for (const [key, thMessage] of thLeaves) {
      const enMessage = enLeaves.get(key);
      if (enMessage === undefined) continue;
      try {
        const a = names(thMessage, "th").join(",");
        const b = names(enMessage, "en").join(",");
        if (a !== b) mismatched.push(`${key}: th {${a}} vs en {${b}}`);
      } catch {
        // A parse error is reported by the test above.
      }
    }
    expect(mismatched).toEqual([]);
  });
});
