// Spec §4.3: tech-stack options, grouped. Stored on startups.tech_stack (jsonb of slug arrays per
// group). "Built with" (the AI coding tools) keeps its own column `ai_tools` (filters and the
// directory `?tool=` use it), so its slugs are the existing AI_TOOLS.
//
// `simpleIcon` = a Simple Icons slug (CC0, `simple-icons` package; config.test.ts checks each one
// exists). Brands missing from Simple Icons fall back to a generic lucide icon.
import type { LucideIcon } from "lucide-react";
import {
  Blocks,
  Cloud,
  Code,
  CreditCard,
  Database,
  Heart,
  Mail,
  Phone,
  QrCode,
  Server,
  Shapes,
  Sparkles,
  Wallet,
  Zap,
} from "lucide-react";

export const STACK_GROUPS = [
  "language",
  "frontend",
  "backend",
  "database",
  "hosting",
  "ai",
  "payments",
  "services",
  "nocode",
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
  language: { nameTh: "ภาษาโปรแกรม", nameEn: "Languages" },
  frontend: { nameTh: "Frontend / แอป", nameEn: "Frontend / app" },
  backend: { nameTh: "Backend", nameEn: "Backend" },
  database: { nameTh: "ฐานข้อมูล", nameEn: "Database" },
  hosting: { nameTh: "โฮสติ้ง", nameEn: "Hosting" },
  ai: { nameTh: "AI / LLM", nameEn: "AI / LLM" },
  payments: { nameTh: "รับชำระเงิน", nameEn: "Payments" },
  services: { nameTh: "บริการเสริม", nameEn: "Services & tools" },
  nocode: {
    nameTh: "No-code / เว็บสำเร็จรูป",
    nameEn: "No-code & site builders",
  },
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
  // --- Added 2026-09-30 (user: "JavaScript is missing"): languages, services, no-code +
  // more frameworks. stackOptions() sorts by group, so order here doesn't matter.
  {
    slug: "javascript",
    label: "JavaScript",
    group: "language",
    simpleIcon: "javascript",
  },
  {
    slug: "typescript",
    label: "TypeScript",
    group: "language",
    simpleIcon: "typescript",
  },
  { slug: "java", label: "Java", group: "language", simpleIcon: "openjdk" },
  { slug: "php", label: "PHP", group: "language", simpleIcon: "php" },
  { slug: "ruby", label: "Ruby", group: "language", simpleIcon: "ruby" },
  { slug: "csharp", label: "C#", group: "language", lucideIcon: Code },
  { slug: "dart", label: "Dart", group: "language", simpleIcon: "dart" },
  { slug: "rust", label: "Rust", group: "language", simpleIcon: "rust" },
  { slug: "c", label: "C", group: "language", simpleIcon: "c" },
  { slug: "cpp", label: "C++", group: "language", simpleIcon: "cplusplus" },
  { slug: "elixir", label: "Elixir", group: "language", simpleIcon: "elixir" },
  { slug: "scala", label: "Scala", group: "language", simpleIcon: "scala" },
  {
    slug: "html-css",
    label: "HTML / CSS",
    group: "language",
    simpleIcon: "html5",
  },
  {
    slug: "angular",
    label: "Angular",
    group: "frontend",
    simpleIcon: "angular",
  },
  { slug: "astro", label: "Astro", group: "frontend", simpleIcon: "astro" },
  { slug: "remix", label: "Remix", group: "frontend", simpleIcon: "remix" },
  {
    slug: "sveltekit",
    label: "SvelteKit",
    group: "frontend",
    simpleIcon: "svelte",
  },
  { slug: "solid", label: "SolidJS", group: "frontend", simpleIcon: "solid" },
  { slug: "vite", label: "Vite", group: "frontend", simpleIcon: "vite" },
  { slug: "gatsby", label: "Gatsby", group: "frontend", simpleIcon: "gatsby" },
  {
    slug: "electron",
    label: "Electron",
    group: "frontend",
    simpleIcon: "electron",
  },
  { slug: "tauri", label: "Tauri", group: "frontend", simpleIcon: "tauri" },
  { slug: "ionic", label: "Ionic", group: "frontend", simpleIcon: "ionic" },
  {
    slug: "capacitor",
    label: "Capacitor",
    group: "frontend",
    simpleIcon: "capacitor",
  },
  { slug: "jquery", label: "jQuery", group: "frontend", simpleIcon: "jquery" },
  {
    slug: "bootstrap",
    label: "Bootstrap",
    group: "frontend",
    simpleIcon: "bootstrap",
  },
  {
    slug: "shadcn-ui",
    label: "shadcn/ui",
    group: "frontend",
    simpleIcon: "shadcnui",
  },
  { slug: "mui", label: "MUI", group: "frontend", simpleIcon: "mui" },
  { slug: "sass", label: "Sass", group: "frontend", simpleIcon: "sass" },
  {
    slug: "three-js",
    label: "Three.js",
    group: "frontend",
    simpleIcon: "threedotjs",
  },
  { slug: "redux", label: "Redux", group: "frontend", simpleIcon: "redux" },
  {
    slug: "android",
    label: "Android (native)",
    group: "frontend",
    simpleIcon: "android",
  },
  { slug: "unity", label: "Unity", group: "frontend", simpleIcon: "unity" },
  {
    slug: "godot",
    label: "Godot",
    group: "frontend",
    simpleIcon: "godotengine",
  },
  {
    slug: "express",
    label: "Express",
    group: "backend",
    simpleIcon: "express",
  },
  { slug: "nestjs", label: "NestJS", group: "backend", simpleIcon: "nestjs" },
  { slug: "hono", label: "Hono", group: "backend", simpleIcon: "hono" },
  { slug: "flask", label: "Flask", group: "backend", simpleIcon: "flask" },
  { slug: "spring", label: "Spring", group: "backend", simpleIcon: "spring" },
  { slug: "dotnet", label: ".NET", group: "backend", simpleIcon: "dotnet" },
  { slug: "deno", label: "Deno", group: "backend", simpleIcon: "deno" },
  { slug: "bun", label: "Bun", group: "backend", simpleIcon: "bun" },
  {
    slug: "graphql",
    label: "GraphQL",
    group: "backend",
    simpleIcon: "graphql",
  },
  { slug: "trpc", label: "tRPC", group: "backend", simpleIcon: "trpc" },
  { slug: "prisma", label: "Prisma", group: "backend", simpleIcon: "prisma" },
  {
    slug: "drizzle",
    label: "Drizzle",
    group: "backend",
    simpleIcon: "drizzle",
  },
  {
    slug: "appwrite",
    label: "Appwrite",
    group: "backend",
    simpleIcon: "appwrite",
  },
  {
    slug: "pocketbase",
    label: "PocketBase",
    group: "backend",
    simpleIcon: "pocketbase",
  },
  { slug: "convex", label: "Convex", group: "backend", simpleIcon: "convex" },
  { slug: "n8n", label: "n8n", group: "backend", simpleIcon: "n8n" },
  {
    slug: "mariadb",
    label: "MariaDB",
    group: "database",
    simpleIcon: "mariadb",
  },
  { slug: "neon", label: "Neon", group: "database", simpleIcon: "neon" },
  {
    slug: "planetscale",
    label: "PlanetScale",
    group: "database",
    simpleIcon: "planetscale",
  },
  { slug: "turso", label: "Turso", group: "database", simpleIcon: "turso" },
  {
    slug: "upstash",
    label: "Upstash",
    group: "database",
    simpleIcon: "upstash",
  },
  {
    slug: "dynamodb",
    label: "DynamoDB",
    group: "database",
    lucideIcon: Database,
  },
  {
    slug: "elasticsearch",
    label: "Elasticsearch",
    group: "database",
    simpleIcon: "elasticsearch",
  },
  {
    slug: "pinecone",
    label: "Pinecone",
    group: "database",
    lucideIcon: Database,
  },
  { slug: "qdrant", label: "Qdrant", group: "database", simpleIcon: "qdrant" },
  { slug: "fly-io", label: "Fly.io", group: "hosting", simpleIcon: "flydotio" },
  {
    slug: "digitalocean",
    label: "DigitalOcean",
    group: "hosting",
    simpleIcon: "digitalocean",
  },
  { slug: "heroku", label: "Heroku", group: "hosting", lucideIcon: Server },
  {
    slug: "hetzner",
    label: "Hetzner",
    group: "hosting",
    simpleIcon: "hetzner",
  },
  {
    slug: "github-pages",
    label: "GitHub Pages",
    group: "hosting",
    simpleIcon: "githubpages",
  },
  { slug: "docker", label: "Docker", group: "hosting", simpleIcon: "docker" },
  {
    slug: "kubernetes",
    label: "Kubernetes",
    group: "hosting",
    simpleIcon: "kubernetes",
  },
  { slug: "deepseek", label: "DeepSeek", group: "ai", simpleIcon: "deepseek" },
  {
    slug: "typhoon",
    label: "Typhoon (Thai LLM)",
    group: "ai",
    lucideIcon: Sparkles,
  },
  {
    slug: "hugging-face",
    label: "Hugging Face",
    group: "ai",
    simpleIcon: "huggingface",
  },
  {
    slug: "langchain",
    label: "LangChain",
    group: "ai",
    simpleIcon: "langchain",
  },
  { slug: "ollama", label: "Ollama", group: "ai", simpleIcon: "ollama" },
  {
    slug: "openrouter",
    label: "OpenRouter",
    group: "ai",
    simpleIcon: "openrouter",
  },
  {
    slug: "elevenlabs",
    label: "ElevenLabs",
    group: "ai",
    simpleIcon: "elevenlabs",
  },
  {
    slug: "vercel-ai-sdk",
    label: "Vercel AI SDK",
    group: "ai",
    simpleIcon: "vercel",
  },
  { slug: "paypal", label: "PayPal", group: "payments", simpleIcon: "paypal" },
  { slug: "xendit", label: "Xendit", group: "payments", simpleIcon: "xendit" },
  {
    slug: "line-pay",
    label: "LINE Pay",
    group: "payments",
    simpleIcon: "line",
  },
  {
    slug: "truemoney",
    label: "TrueMoney",
    group: "payments",
    lucideIcon: Wallet,
  },
  {
    slug: "gb-prime-pay",
    label: "GB Prime Pay",
    group: "payments",
    lucideIcon: CreditCard,
  },
  { slug: "polar", label: "Polar", group: "payments", lucideIcon: CreditCard },
  { slug: "alipay", label: "Alipay", group: "payments", simpleIcon: "alipay" },
  {
    slug: "line-messaging-api",
    label: "LINE Messaging API",
    group: "services",
    simpleIcon: "line",
  },
  { slug: "clerk", label: "Clerk", group: "services", simpleIcon: "clerk" },
  { slug: "auth0", label: "Auth0", group: "services", simpleIcon: "auth0" },
  { slug: "resend", label: "Resend", group: "services", simpleIcon: "resend" },
  { slug: "sendgrid", label: "SendGrid", group: "services", lucideIcon: Mail },
  { slug: "twilio", label: "Twilio", group: "services", lucideIcon: Phone },
  { slug: "sentry", label: "Sentry", group: "services", simpleIcon: "sentry" },
  {
    slug: "posthog",
    label: "PostHog",
    group: "services",
    simpleIcon: "posthog",
  },
  {
    slug: "google-analytics",
    label: "Google Analytics",
    group: "services",
    simpleIcon: "googleanalytics",
  },
  {
    slug: "mixpanel",
    label: "Mixpanel",
    group: "services",
    simpleIcon: "mixpanel",
  },
  {
    slug: "algolia",
    label: "Algolia",
    group: "services",
    simpleIcon: "algolia",
  },
  {
    slug: "meilisearch",
    label: "Meilisearch",
    group: "services",
    simpleIcon: "meilisearch",
  },
  { slug: "zapier", label: "Zapier", group: "services", simpleIcon: "zapier" },
  { slug: "make", label: "Make", group: "services", simpleIcon: "make" },
  { slug: "notion", label: "Notion", group: "services", simpleIcon: "notion" },
  {
    slug: "airtable",
    label: "Airtable",
    group: "services",
    simpleIcon: "airtable",
  },
  {
    slug: "wordpress",
    label: "WordPress",
    group: "nocode",
    simpleIcon: "wordpress",
  },
  { slug: "webflow", label: "Webflow", group: "nocode", simpleIcon: "webflow" },
  { slug: "framer", label: "Framer", group: "nocode", simpleIcon: "framer" },
  { slug: "bubble", label: "Bubble", group: "nocode", lucideIcon: Blocks },
  { slug: "wix", label: "Wix", group: "nocode", simpleIcon: "wix" },
  { slug: "shopify", label: "Shopify", group: "nocode", simpleIcon: "shopify" },
  {
    slug: "woocommerce",
    label: "WooCommerce",
    group: "nocode",
    simpleIcon: "woocommerce",
  },
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

/**
 * Stored stack: slugs per known group, plus `other` for the owner's own tools as
 * `custom:<1-30 chars>` (migration stack_custom_entries).
 */
export type TechStack = Partial<Record<StoredStackGroup, string[]>> & {
  other?: string[];
};

export const STACK_CUSTOM_PREFIX = "custom:";
export const MAX_CUSTOM_STACK_LABEL = 30;

export const isCustomStackValue = (v: string) =>
  v.startsWith(STACK_CUSTOM_PREFIX) &&
  v.length > STACK_CUSTOM_PREFIX.length &&
  v.length <= STACK_CUSTOM_PREFIX.length + MAX_CUSTOM_STACK_LABEL;

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
      (g in ALLOWED || g === "other") &&
      Array.isArray(list) &&
      list.length <= 20 &&
      list.every(
        (s) =>
          typeof s === "string" &&
          (g === "other"
            ? isCustomStackValue(s)
            : ALLOWED[g as StoredStackGroup].has(s)),
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
    openaiapi: "openai",
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
