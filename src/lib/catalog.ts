// Fixed vocabularies. Categories and AI tools come from src/lib/config (spec §4, one source of
// truth, names included); the small enums below keep their labels in messages/*.json (Catalog.*).
export { CATEGORIES, isCategory, type Category } from "./config/categories";
export { AI_TOOLS, isAiTool, type AiTool } from "./config/stack";

export const AUDIENCES = ["b2b", "b2c", "both"] as const;
export const TEAM_SIZES = ["solo", "2-5", "6-20", "20+"] as const;
export const FUNDING = ["bootstrapped", "angel", "vc"] as const;

/** URL-safe slug that satisfies the DB check `^[a-z0-9](?:[a-z0-9-]{0,48}[a-z0-9])?$`. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50)
    .replace(/-+$/g, "");
}
