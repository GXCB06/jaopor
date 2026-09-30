// Spec §4.3: tech-stack options, grouped. Stored on startups.tech_stack (jsonb of slug arrays per
// group). "Built with" (the AI coding tools) keeps its own column `ai_tools` (filters and the
// directory `?tool=` use it), so its slugs are the existing AI_TOOLS.
//
// `simpleIcon` = a Simple Icons slug (CC0, `simple-icons` package; config.test.ts checks each one
// exists). Brands missing from Simple Icons fall back to a generic lucide icon.
import type { LucideIcon } from "lucide-react";
import {
  Cloud,
  Code,
  CreditCard,
  Heart,
  QrCode,
  Shapes,
  Sparkles,
  Zap,
} from "lucide-react";

export const STACK_GROUPS = [
  "frontend",
  "backend",
  "database",
  "hosting",
  "ai",
  "payments",
  "built_with",
] as const;
export type StackGroup = (typeof STACK_GROUPS)[number];

/** Groups stored in startups.tech_stack (built_with lives in `ai_tools`). */
export const STORED_STACK_GROUPS = STACK_GROUPS.filter(
  (g): g is Exclude<StackGroup, "built_with"> => g !== "built_with",
);
export type StoredStackGroup = (typeof STORED_STACK_GROUPS)[number];

export const STACK_GROUP_LABEL: Record<
  StackGroup,
  { nameTh: string; nameEn: string }
> = {
  frontend: { nameTh: "Frontend / แอป", nameEn: "Frontend / app" },
  backend: { nameTh: "Backend", nameEn: "Backend" },
  database: { nameTh: "ฐานข้อมูล", nameEn: "Database" },
  hosting: { nameTh: "โฮสติ้ง", nameEn: "Hosting" },
  ai: { nameTh: "AI / LLM", nameEn: "AI / LLM" },
  payments: { nameTh: "รับชำระเงิน", nameEn: "Payments" },
  built_with: { nameTh: "สร้างด้วย", nameEn: "Built with" },
};

export type StackItem = {
  slug: string;
  label: string;
  /** Only when the label needs translating ("Other"). */
  labelTh?: string;
  group: StackGroup;
  simpleIcon?: string;
  lucideIcon?: LucideIcon;
};

export const STACK_LIST = [
  // Frontend
  {
    slug: "next-js",
    label: "Next.js",
    group: "frontend",
    simpleIcon: "nextdotjs",
  },
  { slug: "react", label: "React", group: "frontend", simpleIcon: "react" },
  {
    slug: "react-native",
    label: "React Native",
    group: "frontend",
    simpleIcon: "react",
  },
  { slug: "vue", label: "Vue", group: "frontend", simpleIcon: "vuedotjs" },
  { slug: "nuxt", label: "Nuxt", group: "frontend", simpleIcon: "nuxt" },
  { slug: "svelte", label: "Svelte", group: "frontend", simpleIcon: "svelte" },
  {
    slug: "flutter",
    label: "Flutter",
    group: "frontend",
    simpleIcon: "flutter",
  },
  { slug: "swift", label: "Swift", group: "frontend", simpleIcon: "swift" },
  { slug: "swiftui", label: "SwiftUI", group: "frontend", simpleIcon: "swift" },
  { slug: "kotlin", label: "Kotlin", group: "frontend", simpleIcon: "kotlin" },
  {
    slug: "tailwind-css",
    label: "Tailwind CSS",
    group: "frontend",
    simpleIcon: "tailwindcss",
  },
  { slug: "expo", label: "Expo", group: "frontend", simpleIcon: "expo" },
  // Backend
  {
    slug: "node-js",
    label: "Node.js",
    group: "backend",
    simpleIcon: "nodedotjs",
  },
  { slug: "python", label: "Python", group: "backend", simpleIcon: "python" },
  { slug: "go", label: "Go", group: "backend", simpleIcon: "go" },
  {
    slug: "laravel",
    label: "Laravel",
    group: "backend",
    simpleIcon: "laravel",
  },
  { slug: "django", label: "Django", group: "backend", simpleIcon: "django" },
  {
    slug: "fastapi",
    label: "FastAPI",
    group: "backend",
    simpleIcon: "fastapi",
  },
  {
    slug: "supabase",
    label: "Supabase",
    group: "backend",
    simpleIcon: "supabase",
  },
  {
    slug: "firebase",
    label: "Firebase",
    group: "backend",
    simpleIcon: "firebase",
  },
  {
    slug: "rails",
    label: "Rails",
    group: "backend",
    simpleIcon: "rubyonrails",
  },
  // Database
  {
    slug: "postgresql",
    label: "PostgreSQL",
    group: "database",
    simpleIcon: "postgresql",
  },
  { slug: "mysql", label: "MySQL", group: "database", simpleIcon: "mysql" },
  {
    slug: "mongodb",
    label: "MongoDB",
    group: "database",
    simpleIcon: "mongodb",
  },
  { slug: "redis", label: "Redis", group: "database", simpleIcon: "redis" },
  { slug: "sqlite", label: "SQLite", group: "database", simpleIcon: "sqlite" },
  // Hosting
  { slug: "vercel", label: "Vercel", group: "hosting", simpleIcon: "vercel" },
  {
    slug: "cloudflare",
    label: "Cloudflare",
    group: "hosting",
    simpleIcon: "cloudflare",
  },
  { slug: "aws", label: "AWS", group: "hosting", lucideIcon: Cloud },
  {
    slug: "google-cloud",
    label: "Google Cloud",
    group: "hosting",
    simpleIcon: "googlecloud",
  },
  {
    slug: "railway",
    label: "Railway",
    group: "hosting",
    simpleIcon: "railway",
  },
  { slug: "render", label: "Render", group: "hosting", simpleIcon: "render" },
  {
    slug: "netlify",
    label: "Netlify",
    group: "hosting",
    simpleIcon: "netlify",
  },
  // AI / LLM
  { slug: "claude", label: "Claude", group: "ai", simpleIcon: "claude" },
  { slug: "openai", label: "OpenAI", group: "ai", lucideIcon: Sparkles },
  { slug: "gemini", label: "Gemini", group: "ai", simpleIcon: "googlegemini" },
  { slug: "llama", label: "Llama", group: "ai", simpleIcon: "meta" },
  { slug: "mistral", label: "Mistral", group: "ai", simpleIcon: "mistralai" },
  // Payments
  { slug: "stripe", label: "Stripe", group: "payments", simpleIcon: "stripe" },
  {
    slug: "revenuecat",
    label: "RevenueCat",
    group: "payments",
    simpleIcon: "revenuecat",
  },
  { slug: "omise", label: "Omise", group: "payments", lucideIcon: CreditCard },
  { slug: "2c2p", label: "2C2P", group: "payments", lucideIcon: CreditCard },
  {
    slug: "promptpay",
    label: "PromptPay",
    group: "payments",
    lucideIcon: QrCode,
  },
  {
    slug: "lemon-squeezy",
    label: "Lemon Squeezy",
    group: "payments",
    simpleIcon: "lemonsqueezy",
  },
  { slug: "paddle", label: "Paddle", group: "payments", simpleIcon: "paddle" },
  // Built with (= AI_TOOLS, stored in startups.ai_tools)
  {
    slug: "claude-code",
    label: "Claude Code",
    group: "built_with",
    simpleIcon: "claude",
  },
  {
    slug: "opencode",
    label: "OpenCode",
    group: "built_with",
    simpleIcon: "opencode",
  },
  {
    slug: "cursor",
    label: "Cursor",
    group: "built_with",
    simpleIcon: "cursor",
  },
  { slug: "codex", label: "Codex", group: "built_with", lucideIcon: Code },
  {
    slug: "windsurf",
    label: "Windsurf",
    group: "built_with",
    simpleIcon: "windsurf",
  },
  { slug: "lovable", label: "Lovable", group: "built_with", lucideIcon: Heart },
  { slug: "v0", label: "v0", group: "built_with", simpleIcon: "v0" },
  {
    slug: "replit",
    label: "Replit",
    group: "built_with",
    simpleIcon: "replit",
  },
  { slug: "bolt", label: "Bolt", group: "built_with", lucideIcon: Zap },
  {
    slug: "other",
    label: "Other",
    labelTh: "อื่น ๆ",
    group: "built_with",
    lucideIcon: Shapes,
  },
] as const satisfies readonly StackItem[];

// "claude" appears twice on purpose (AI/LLM model vs. built_with Claude chat); keys are group+slug.
export const AI_TOOLS = [
  "claude-code",
  "claude",
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

export function isAiTool(v: unknown): v is AiTool {
  return typeof v === "string" && (AI_TOOLS as readonly string[]).includes(v);
}

export function stackItems(group: StackGroup): readonly StackItem[] {
  return STACK_LIST.filter((i) => i.group === group);
}

/** Label for an AI tool slug (the built_with group; "claude" = Claude chat). */
export function aiToolLabel(slug: AiTool, locale: string): string {
  if (slug === "claude") return "Claude";
  const item = STACK_LIST.find(
    (i) => i.group === "built_with" && i.slug === slug,
  ) as StackItem | undefined;
  if (!item) return slug;
  return locale === "th" && item.labelTh ? item.labelTh : item.label;
}

export type TechStack = Partial<Record<StoredStackGroup, string[]>>;

const ALLOWED: Record<StoredStackGroup, Set<string>> = Object.fromEntries(
  STORED_STACK_GROUPS.map((g) => [
    g,
    new Set(stackItems(g).map((i) => i.slug)),
  ]),
) as Record<StoredStackGroup, Set<string>>;

/** True when every group is known and holds only that group's slugs (mirrors the DB check). */
export function isValidTechStack(v: unknown): v is TechStack {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  return Object.entries(v).every(
    ([g, list]) =>
      g in ALLOWED &&
      Array.isArray(list) &&
      list.length <= 12 &&
      list.every(
        (s) => typeof s === "string" && ALLOWED[g as StoredStackGroup].has(s),
      ),
  );
}

/** Existing free-text label ("Next.js", "Claude API") → group + slug, for the back-fill. */
export function matchStackLabel(
  label: string,
): { group: StoredStackGroup; slug: string } | null {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const n = norm(label);
  const alias: Record<string, string> = {
    claudeapi: "claude",
    anthropic: "claude",
    postgres: "postgresql",
    nextjs: "next-js",
    nodejs: "node-js",
    tailwind: "tailwind-css",
    gcp: "google-cloud",
    rubyonrails: "rails",
  };
  const target = alias[n] ?? null;
  for (const i of STACK_LIST) {
    if (i.group === "built_with") continue;
    if (
      (target && i.slug === target) ||
      norm(i.label) === n ||
      norm(i.slug) === n
    )
      return { group: i.group as StoredStackGroup, slug: i.slug };
  }
  return null;
}
