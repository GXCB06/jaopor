// Phase 9c builder directory (/builders): pure filtering, ordering and card helpers. The rows are
// built server-side from what an anonymous visitor may see (lib/data/builder.ts listBuilders).

import type { Province, Region } from "@/lib/config/provinces";

export type DirectoryBuilder = {
  id: string;
  handle: string;
  name: string;
  avatarUrl: string | null;
  headline: string | null;
  status: string;
  /** null when the builder hides their province. */
  province: Province | null;
  /** Already ordered: superpowers first, then the builder's own order. */
  skills: { slug: string; superpower: boolean }[];
  tools: string[];
  works: number;
  verifiedWorks: number;
  /** Verified MRR summed over confirmed, non-demo works (USD cents). */
  mrrCents: number;
  createdAt: string;
};

export type BuilderFilters = {
  q?: string;
  skill?: string;
  province?: Province;
  region?: Region;
  status?: string;
  tool?: string;
  verified?: boolean;
};

export const BUILDERS_PAGE_SIZE = 24;

/** Superpowers first, then by position (the order the builder chose). */
export function orderSkills(
  rows: { skill_slug: string; is_superpower: boolean; position: number }[],
): { slug: string; superpower: boolean }[] {
  return [...rows]
    .sort(
      (a, b) =>
        Number(b.is_superpower) - Number(a.is_superpower) ||
        a.position - b.position,
    )
    .map((r) => ({ slug: r.skill_slug, superpower: r.is_superpower }));
}

export function filterBuilders(
  list: DirectoryBuilder[],
  f: BuilderFilters,
  regionOf: (p: Province) => Region | undefined,
): DirectoryBuilder[] {
  const q = f.q?.trim().toLowerCase().replace(/^@/, "");
  return list.filter(
    (b) =>
      (!q ||
        b.handle.includes(q) ||
        b.name.toLowerCase().includes(q) ||
        (b.headline ?? "").toLowerCase().includes(q)) &&
      (!f.skill || b.skills.some((s) => s.slug === f.skill)) &&
      (!f.province || b.province === f.province) &&
      (!f.region ||
        (b.province !== null && regionOf(b.province) === f.region)) &&
      (!f.status || b.status === f.status) &&
      (!f.tool || b.tools.includes(f.tool)) &&
      (!f.verified || b.verifiedWorks > 0),
  );
}

/** Verified revenue first, then verified works, then any works, then the newest. */
export function sortBuilders(list: DirectoryBuilder[]): DirectoryBuilder[] {
  return [...list].sort(
    (a, b) =>
      b.mrrCents - a.mrrCents ||
      b.verifiedWorks - a.verifiedWorks ||
      b.works - a.works ||
      b.createdAt.localeCompare(a.createdAt),
  );
}

/** QuickSearch "คน" group: handle prefix matches first, then name / handle / headline matches. */
export function searchBuilders(
  list: DirectoryBuilder[],
  q: string,
  limit: number,
): DirectoryBuilder[] {
  const needle = q.trim().toLowerCase().replace(/^@/, "");
  if (!needle) return [];
  const score = (b: DirectoryBuilder) =>
    b.handle.startsWith(needle)
      ? 0
      : b.name.toLowerCase().startsWith(needle)
        ? 1
        : b.handle.includes(needle) || b.name.toLowerCase().includes(needle)
          ? 2
          : (b.headline ?? "").toLowerCase().includes(needle)
            ? 3
            : -1;
  return list
    .map((b) => ({ b, s: score(b) }))
    .filter((x) => x.s >= 0)
    .sort((x, y) => x.s - y.s || y.b.mrrCents - x.b.mrrCents)
    .slice(0, limit)
    .map((x) => x.b);
}
