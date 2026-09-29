// Fixed vocabularies. Must match the CHECK constraints in supabase/migrations/*_schema_v1.sql.
// Labels live in messages/{th,en}.json under Catalog.*

export const CATEGORIES = [
  "ai",
  "saas",
  "developer-tools",
  "fintech",
  "marketing",
  "ecommerce",
  "productivity",
  "education",
  "health",
  "content",
  "design",
  "analytics",
  "mobile",
  "other",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const AI_TOOLS = [
  "claude-code",
  "opencode",
  "cursor",
  "codex",
  "windsurf",
  "lovable",
  "v0",
  "replit",
  "bolt",
  "other",
] as const;
export type AiTool = (typeof AI_TOOLS)[number];

export const AUDIENCES = ["b2b", "b2c", "both"] as const;
export const TEAM_SIZES = ["solo", "2-5", "6-20", "20+"] as const;
export const FUNDING = ["bootstrapped", "angel", "vc"] as const;

export function isCategory(v: unknown): v is Category {
  return typeof v === "string" && (CATEGORIES as readonly string[]).includes(v);
}

export function isAiTool(v: unknown): v is AiTool {
  return typeof v === "string" && (AI_TOOLS as readonly string[]).includes(v);
}

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
