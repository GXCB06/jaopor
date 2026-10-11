// Multi-choice filters in the URL (Design.md §5 Dropdowns): one parameter, values joined by
// commas (?category=saas,ai). Repeated parameters (?category=saas&category=ai) are read too.
// Unknown values are dropped, duplicates removed, order kept.

/** Most values one filter accepts (keeps URLs and SQL short). */
export const LIST_MAX = 20;

export function parseList<T extends string>(
  v: string | string[] | undefined,
  isValid: (x: string) => boolean,
): T[] {
  const raw = (Array.isArray(v) ? v : v ? [v] : []).flatMap((s) =>
    s.split(","),
  );
  const out: T[] = [];
  for (const s of raw) {
    const x = s.trim();
    if (x && isValid(x) && !out.includes(x as T)) out.push(x as T);
    if (out.length >= LIST_MAX) break;
  }
  return out;
}

/** The URL value for a list, or undefined when empty (left out of links). */
export function joinList(
  list: readonly string[] | undefined,
): string | undefined {
  return list?.length ? list.join(",") : undefined;
}

/** A single value or a list, as a list. */
export function asList<T>(v: T | readonly T[] | undefined): T[] {
  return v === undefined ? [] : Array.isArray(v) ? [...v] : [v as T];
}
