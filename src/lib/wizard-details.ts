// Add-startup wizard v4 step 2 (Design.md §5): what "details complete" means. Pure, shared by the
// step itself (client), the /new?draft= resume (server) and the dashboard's "ทำต่อให้เสร็จ".

import type { AiTool } from "@/lib/catalog";
import type { PRICING_CURRENCIES, PricingPeriod } from "@/lib/pricing";

export type WizardDetails = {
  description: string;
  valueProposition: string;
  problemSolved: string;
  audience: string;
  pricingPeriod: PricingPeriod | "";
  pricingAmount: string;
  pricingCurrency: (typeof PRICING_CURRENCIES)[number];
  pricingNote: string;
  aiTools: AiTool[];
  techStack: string[];
  founded: string;
  teamSize: string;
  funding: string;
};

export type MissingDetail = keyof WizardDetails | "pricing";

/** The required fields that are still empty (shown as "ยังขาด: …"). */
export function missingDetails(d: WizardDetails): MissingDetail[] {
  const out: MissingDetail[] = [];
  if (!d.description.trim()) out.push("description");
  if (!d.valueProposition.trim()) out.push("valueProposition");
  if (!d.problemSolved.trim()) out.push("problemSolved");
  if (!d.audience) out.push("audience");
  const amount = Number(d.pricingAmount);
  if (
    !d.pricingPeriod ||
    (d.pricingPeriod !== "free" &&
      (!d.pricingAmount.trim() || !Number.isFinite(amount) || amount < 0))
  )
    out.push("pricing");
  if (d.aiTools.length === 0) out.push("aiTools");
  if (d.techStack.length === 0) out.push("techStack");
  if (!d.founded) out.push("founded");
  return out;
}

/** The same rule on a startups row (server side: resume and dashboard). */
export function detailsCompleteRow(row: {
  description: string | null;
  value_proposition: string | null;
  problem_solved: string | null;
  audience: string | null;
  pricing_period: string | null;
  pricing_amount: number | null;
  ai_tools: string[] | null;
  tech_stack: unknown;
  founded_on: string | null;
}): boolean {
  const stack = Array.isArray(row.tech_stack)
    ? row.tech_stack
    : row.tech_stack && typeof row.tech_stack === "object"
      ? Object.values(row.tech_stack as Record<string, unknown>).flat()
      : [];
  return (
    missingDetails({
      description: row.description ?? "",
      valueProposition: row.value_proposition ?? "",
      problemSolved: row.problem_solved ?? "",
      audience: row.audience ?? "",
      pricingPeriod: (row.pricing_period ?? "") as PricingPeriod | "",
      pricingAmount:
        row.pricing_amount != null ? String(row.pricing_amount) : "",
      pricingCurrency: "THB",
      pricingNote: "",
      aiTools: (row.ai_tools ?? []) as AiTool[],
      techStack: stack.filter((x): x is string => typeof x === "string"),
      founded: row.founded_on ?? "",
      teamSize: "",
      funding: "",
    }).length === 0
  );
}
