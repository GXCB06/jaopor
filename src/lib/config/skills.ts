// Phase 9: builder skills, grouped. Slugs must match the profile_skills CHECK list in migration
// builder_profiles (config.test.ts checks it). Names in both languages; read via localizedName().

export const SKILL_GROUPS = [
  "engineering",
  "product",
  "design",
  "growth",
  "sales",
  "ops",
  "ai",
] as const;
export type SkillGroup = (typeof SKILL_GROUPS)[number];

export const SKILL_GROUP_LABEL: Record<
  SkillGroup,
  { nameTh: string; nameEn: string }
> = {
  engineering: { nameTh: "วิศวกรรม", nameEn: "Engineering" },
  product: { nameTh: "โปรดักต์", nameEn: "Product" },
  design: { nameTh: "ดีไซน์", nameEn: "Design" },
  growth: { nameTh: "การตลาด / Growth", nameEn: "Growth / Marketing" },
  sales: { nameTh: "การขาย", nameEn: "Sales" },
  ops: { nameTh: "ปฏิบัติการ / การเงิน", nameEn: "Ops / Finance" },
  ai: { nameTh: "AI", nameEn: "AI" },
};

export type SkillDef = {
  slug: string;
  group: SkillGroup;
  nameTh: string;
  nameEn: string;
};

export const SKILL_LIST = [
  {
    slug: "frontend",
    group: "engineering",
    nameTh: "Frontend",
    nameEn: "Frontend",
  },
  {
    slug: "backend",
    group: "engineering",
    nameTh: "Backend",
    nameEn: "Backend",
  },
  {
    slug: "fullstack",
    group: "engineering",
    nameTh: "Full-stack",
    nameEn: "Full-stack",
  },
  {
    slug: "mobile-dev",
    group: "engineering",
    nameTh: "พัฒนาแอปมือถือ",
    nameEn: "Mobile development",
  },
  {
    slug: "devops",
    group: "engineering",
    nameTh: "DevOps / Cloud",
    nameEn: "DevOps / Cloud",
  },
  {
    slug: "data-engineering",
    group: "engineering",
    nameTh: "Data engineering",
    nameEn: "Data engineering",
  },
  {
    slug: "security",
    group: "engineering",
    nameTh: "ความปลอดภัย",
    nameEn: "Security",
  },
  {
    slug: "qa",
    group: "engineering",
    nameTh: "ทดสอบระบบ (QA)",
    nameEn: "QA / Testing",
  },
  {
    slug: "embedded",
    group: "engineering",
    nameTh: "Embedded / IoT",
    nameEn: "Embedded / IoT",
  },
  {
    slug: "game-dev",
    group: "engineering",
    nameTh: "พัฒนาเกม",
    nameEn: "Game development",
  },
  {
    slug: "web3-dev",
    group: "engineering",
    nameTh: "Web3 / Blockchain",
    nameEn: "Web3 / Blockchain",
  },
  {
    slug: "line-dev",
    group: "engineering",
    nameTh: "LINE OA / LIFF",
    nameEn: "LINE OA / LIFF",
  },
  {
    slug: "product-management",
    group: "product",
    nameTh: "Product management",
    nameEn: "Product management",
  },
  {
    slug: "ux-research",
    group: "product",
    nameTh: "UX research",
    nameEn: "UX research",
  },
  {
    slug: "no-code",
    group: "product",
    nameTh: "No-code / Low-code",
    nameEn: "No-code / Low-code",
  },
  {
    slug: "project-management",
    group: "product",
    nameTh: "บริหารโปรเจกต์",
    nameEn: "Project management",
  },
  {
    slug: "technical-writing",
    group: "product",
    nameTh: "เขียนเอกสารเทคนิค",
    nameEn: "Technical writing",
  },
  {
    slug: "ui-design",
    group: "design",
    nameTh: "UI design",
    nameEn: "UI design",
  },
  {
    slug: "ux-design",
    group: "design",
    nameTh: "UX design",
    nameEn: "UX design",
  },
  {
    slug: "graphic-design",
    group: "design",
    nameTh: "กราฟิกดีไซน์",
    nameEn: "Graphic design",
  },
  {
    slug: "brand-design",
    group: "design",
    nameTh: "ออกแบบแบรนด์",
    nameEn: "Brand design",
  },
  {
    slug: "motion-design",
    group: "design",
    nameTh: "Motion design",
    nameEn: "Motion design",
  },
  { slug: "3d-design", group: "design", nameTh: "3D", nameEn: "3D" },
  { slug: "seo", group: "growth", nameTh: "SEO", nameEn: "SEO" },
  {
    slug: "content-marketing",
    group: "growth",
    nameTh: "Content marketing",
    nameEn: "Content marketing",
  },
  {
    slug: "social-media",
    group: "growth",
    nameTh: "โซเชียลมีเดีย",
    nameEn: "Social media",
  },
  {
    slug: "performance-ads",
    group: "growth",
    nameTh: "ยิงแอด",
    nameEn: "Performance ads",
  },
  {
    slug: "community-building",
    group: "growth",
    nameTh: "สร้างคอมมูนิตี้",
    nameEn: "Community building",
  },
  {
    slug: "copywriting",
    group: "growth",
    nameTh: "Copywriting",
    nameEn: "Copywriting",
  },
  {
    slug: "video-production",
    group: "growth",
    nameTh: "ทำวิดีโอ",
    nameEn: "Video production",
  },
  {
    slug: "influencer-marketing",
    group: "growth",
    nameTh: "Influencer / KOL",
    nameEn: "Influencer marketing",
  },
  {
    slug: "email-marketing",
    group: "growth",
    nameTh: "Email marketing",
    nameEn: "Email marketing",
  },
  { slug: "b2b-sales", group: "sales", nameTh: "ขาย B2B", nameEn: "B2B sales" },
  {
    slug: "partnerships",
    group: "sales",
    nameTh: "พาร์ทเนอร์ชิป",
    nameEn: "Partnerships",
  },
  {
    slug: "customer-success",
    group: "sales",
    nameTh: "Customer success",
    nameEn: "Customer success",
  },
  {
    slug: "fundraising",
    group: "sales",
    nameTh: "ระดมทุน",
    nameEn: "Fundraising",
  },
  {
    slug: "operations",
    group: "ops",
    nameTh: "ปฏิบัติการ",
    nameEn: "Operations",
  },
  { slug: "finance", group: "ops", nameTh: "การเงิน", nameEn: "Finance" },
  { slug: "accounting", group: "ops", nameTh: "บัญชี", nameEn: "Accounting" },
  { slug: "legal", group: "ops", nameTh: "กฎหมาย", nameEn: "Legal" },
  { slug: "hr", group: "ops", nameTh: "HR", nameEn: "HR" },
  {
    slug: "supply-chain",
    group: "ops",
    nameTh: "Supply chain",
    nameEn: "Supply chain",
  },
  {
    slug: "prompt-engineering",
    group: "ai",
    nameTh: "Prompt engineering",
    nameEn: "Prompt engineering",
  },
  { slug: "llm-apps", group: "ai", nameTh: "สร้างแอป LLM", nameEn: "LLM apps" },
  { slug: "ai-agents", group: "ai", nameTh: "AI agents", nameEn: "AI agents" },
  {
    slug: "machine-learning",
    group: "ai",
    nameTh: "Machine learning",
    nameEn: "Machine learning",
  },
  {
    slug: "computer-vision",
    group: "ai",
    nameTh: "Computer vision",
    nameEn: "Computer vision",
  },
  {
    slug: "data-science",
    group: "ai",
    nameTh: "Data science",
    nameEn: "Data science",
  },
  {
    slug: "ai-automation",
    group: "ai",
    nameTh: "AI automation",
    nameEn: "AI automation",
  },
] as const satisfies readonly SkillDef[];

export type Skill = (typeof SKILL_LIST)[number]["slug"];

const BY_SLUG = new Map<string, SkillDef>(SKILL_LIST.map((s) => [s.slug, s]));

export function isSkill(v: unknown): v is Skill {
  return typeof v === "string" && BY_SLUG.has(v);
}

export function getSkill(slug: string): SkillDef | undefined {
  return BY_SLUG.get(slug);
}

export const MAX_SKILLS = 20;
export const MAX_SUPERPOWERS = 3;
