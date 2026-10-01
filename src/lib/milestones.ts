// Phase 10d automatic milestone posts: which milestones a startup has reached, from verified
// numbers only. Pure; the daily job (lib/milestones-job.ts) records them in the `milestones`
// ledger and posts them.
//
// Rules (owner decisions 2026-10-01): per startup; only verified data (demo or unpublished
// startups never qualify); in each family only the highest level reached is posted, and never a
// level at or below one already posted (so a drop and recovery, or a deleted post, never brings a
// milestone back, and the first run doesn't flood the feed with every lower level).

export const MILESTONE_FAMILIES = [
  "verified",
  "mrr",
  "revenue",
  "stars",
] as const;
export type MilestoneFamily = (typeof MILESTONE_FAMILIES)[number];

/** Levels per family (THB for money, stars for GitHub); "verified" has a single level. */
export const MILESTONE_LEVELS: Record<MilestoneFamily, readonly number[]> = {
  verified: [1],
  mrr: [1_000, 10_000, 100_000],
  revenue: [100_000, 1_000_000],
  stars: [100, 1_000],
};

export type MilestoneStartup = {
  id: number;
  name: string;
  status: string;
  is_demo: boolean;
  verification_status: string;
  /** USD cents (verified revenue sources only). */
  mrr_cents: number | null;
  revenue_all_time_cents: number | null;
  build_stars: number | null;
  build_synced_at: string | null;
};

export type Milestone = { key: string; family: MilestoneFamily; level: number };

export const milestoneKey = (
  family: MilestoneFamily,
  level: number,
  startupId: number,
) =>
  family === "verified"
    ? `verified:${startupId}`
    : `${family}_${level}:${startupId}`;

export function parseMilestoneKey(
  key: string | null | undefined,
): { family: MilestoneFamily; level: number; startupId: number } | null {
  const m = /^(verified|mrr|revenue|stars)(?:_(\d+))?:(\d+)$/.exec(key ?? "");
  if (!m) return null;
  const family = m[1] as MilestoneFamily;
  if ((family === "verified") !== (m[2] === undefined)) return null;
  return {
    family,
    level: family === "verified" ? 1 : Number(m[2]),
    startupId: Number(m[3]),
  };
}

/** The value a family is measured on, or null when it isn't verified / known. */
function measure(
  s: MilestoneStartup,
  family: MilestoneFamily,
  thbPerUsd: number | null,
): number | null {
  const revenueVerified = s.verification_status === "verified";
  switch (family) {
    case "verified":
      return revenueVerified ? 1 : null;
    case "mrr":
      return revenueVerified && s.mrr_cents !== null && thbPerUsd
        ? (s.mrr_cents / 100) * thbPerUsd
        : null;
    case "revenue":
      return revenueVerified && s.revenue_all_time_cents !== null && thbPerUsd
        ? (s.revenue_all_time_cents / 100) * thbPerUsd
        : null;
    case "stars":
      // Stars only count once the GitHub build source has synced them.
      return s.build_synced_at !== null ? s.build_stars : null;
  }
}

/** Milestones to post now for one startup, given the keys already in the ledger. */
export function milestonesDue(
  s: MilestoneStartup,
  ledger: ReadonlySet<string>,
  thbPerUsd: number | null,
): Milestone[] {
  if (s.is_demo || s.status !== "published") return [];
  const due: Milestone[] = [];
  for (const family of MILESTONE_FAMILIES) {
    const value = measure(s, family, thbPerUsd);
    if (value === null) continue;
    const reached = MILESTONE_LEVELS[family].filter((l) => value >= l);
    const top = reached.at(-1);
    if (top === undefined) continue;
    const alreadyAtOrAbove = MILESTONE_LEVELS[family].some(
      (l) => l >= top && ledger.has(milestoneKey(family, l, s.id)),
    );
    if (!alreadyAtOrAbove)
      due.push({ key: milestoneKey(family, top, s.id), family, level: top });
  }
  return due;
}

/** Stored post body (Thai, the default locale); the card renders the visitor's language from the key. */
export function milestoneBodyTh(
  name: string,
  family: MilestoneFamily,
  level: number,
): string {
  const amount = level.toLocaleString("en");
  switch (family) {
    case "verified":
      return `${name} ยืนยันตัวเลขกับ JaoPor แล้ว`;
    case "mrr":
      return `${name} แตะ ฿${amount} MRR`;
    case "revenue":
      return `${name} มีรายได้รวมทะลุ ฿${amount}`;
    case "stars":
      return `${name} ได้ ★${amount} บน GitHub`;
  }
}
