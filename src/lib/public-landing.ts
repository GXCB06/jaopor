// Public payload for the separate landing site (GET /api/public/landing). Pure and client-safe, so
// the route and its tests share one definition. It only reads fields visitors already see on the
// site (public_* twins, R2 disclosure: a number is null unless its owner shows it exact), never
// demo projects (their numbers are made up), and never an anonymous project's real identity.
// The founder stays visible on anonymous projects (owner decision, Project.md §7).

import { anonymousMask, isAnonymousSlug } from "@/lib/anonymous";
import { growthPct } from "@/lib/format";
import {
  BOARD_DEFINITIONS,
  BOARD_METRICS,
  boardValue,
  rankBoard,
  type BoardMetric,
} from "@/lib/leaderboard";
import { SOURCE_NAME, isSource } from "@/lib/sources/catalog";
import { logoUrl } from "@/lib/supabase/logo-url";

/** The StartupRow fields this payload reads (a structural subset, so tests can build one cheaply). */
export type LandingSource = {
  id: number;
  slug: string;
  name: string;
  tagline: string | null;
  logo_path: string | null;
  category: string;
  province: string | null;
  is_demo: boolean;
  status: string;
  verification_status: string;
  verified_provider: string | null;
  traffic_provider: string | null;
  github_repo: string | null;
  mrr_cents: number | null;
  revenue_30d_cents: number | null;
  revenue_prev_30d_cents: number | null;
  visitors_30d: number | null;
  visitors_prev_30d: number | null;
  build_commits: number | null;
  last_synced_at: string | null;
  traffic_synced_at: string | null;
  build_synced_at: string | null;
  created_at: string;
  owner: {
    handle: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
};

/** How a number is backed: "verified" = read from the source, "counted" = reported by a script. */
export type NumberBasis = "verified" | "counted";

export type PublicProject = {
  slug: string;
  /** Null while anonymous: show `mask` blurred instead. */
  name: string | null;
  anonymous: boolean;
  mask: string | null;
  tagline: string | null;
  logo: string | null;
  category: string;
  province: string | null;
  /** Absolute path on the app site, without the locale. */
  path: string;
  founder: { name: string; handle: string | null } | null;
  /** USD cents; null = no public number (never zero for "no data"). */
  mrrCents: number | null;
  revenue30dCents: number | null;
  visitors30d: number | null;
  commits: number | null;
  /** Revenue growth, trailing 30 days vs the 30 before; null when unknown. */
  growthPct: number | null;
  proof: {
    revenue: { basis: "verified"; source: string } | null;
    visitors: { basis: "counted"; source: string } | null;
    build: { basis: "verified"; source: "GitHub" } | null;
  };
  /** Latest sync time among the project's numbers. */
  syncedAt: string | null;
};

export type PublicBoardRow = {
  rank: number;
  tied: boolean;
  /** The value this board ranks by (cents for money boards). */
  value: number;
  project: PublicProject;
};

export type PublicBoard = {
  metric: BoardMetric;
  basis: NumberBasis;
  period: "current" | "30d" | "all_time";
  rows: PublicBoardRow[];
};

export type LandingPayload = {
  generatedAt: string;
  counts: { projects: number; withVerifiedRevenue: number };
  /** Listed projects per category slug. */
  categories: Record<string, number>;
  /** THB per USD (ECB), or null when the rate is unavailable. */
  thbPerUsd: number | null;
  recent: PublicProject[];
  boards: PublicBoard[];
};

const sourceName = (id: string | null): string | null =>
  id && isSource(id) ? SOURCE_NAME[id] : null;

const latest = (...times: (string | null)[]): string | null => {
  const valid = times.filter((t): t is string => !!t);
  return valid.length ? valid.reduce((a, b) => (a > b ? a : b)) : null;
};

export function toPublicProject(s: LandingSource): PublicProject {
  const anonymous = isAnonymousSlug(s.slug);
  const revenueSource =
    s.verification_status === "verified" && s.mrr_cents !== null
      ? sourceName(s.verified_provider)
      : null;
  const visitorsSource =
    s.visitors_30d !== null ? sourceName(s.traffic_provider) : null;
  const founderName =
    s.owner?.display_name ?? (s.owner?.handle ? `@${s.owner.handle}` : null);
  return {
    slug: s.slug,
    name: anonymous ? null : s.name,
    anonymous,
    mask: anonymous ? anonymousMask(s.slug) : null,
    tagline: s.tagline,
    // An anonymous row holds no logo, but never rely on that alone.
    logo: anonymous ? null : logoUrl(s.logo_path, { absolute: true }),
    category: s.category,
    province: s.province,
    path: `/startup/${s.slug}`,
    founder: founderName
      ? { name: founderName, handle: s.owner?.handle ?? null }
      : null,
    mrrCents: s.mrr_cents,
    revenue30dCents: s.revenue_30d_cents,
    visitors30d: s.visitors_30d,
    commits: s.build_commits,
    growthPct: growthPct(s.revenue_30d_cents, s.revenue_prev_30d_cents),
    proof: {
      revenue: revenueSource
        ? { basis: "verified", source: revenueSource }
        : null,
      visitors: visitorsSource
        ? { basis: "counted", source: visitorsSource }
        : null,
      build:
        s.github_repo && s.build_commits !== null
          ? { basis: "verified", source: "GitHub" }
          : null,
    },
    syncedAt: latest(s.last_synced_at, s.traffic_synced_at, s.build_synced_at),
  };
}

/** Real projects only: published and not a sample. */
export const isLandingProject = (s: LandingSource): boolean =>
  !s.is_demo && s.status === "published";

export function buildLandingPayload(input: {
  recent: readonly LandingSource[];
  /** Candidates per board, as returned by getBoard (already eligibility-filtered). */
  lists: Record<BoardMetric, readonly LandingSource[]>;
  counts: { total: number; verified: number };
  categories: Record<string, number>;
  thbPerUsd: number | null;
  now?: Date;
  recentLimit?: number;
  boardLimit?: number;
}): LandingPayload {
  const recentLimit = input.recentLimit ?? 6;
  const boardLimit = input.boardLimit ?? 5;
  return {
    generatedAt: (input.now ?? new Date()).toISOString(),
    counts: {
      projects: input.counts.total,
      withVerifiedRevenue: input.counts.verified,
    },
    categories: input.categories,
    thbPerUsd: input.thbPerUsd,
    recent: input.recent
      .filter(isLandingProject)
      .slice(0, recentLimit)
      .map(toPublicProject),
    boards: BOARD_METRICS.map((metric) => {
      const def = BOARD_DEFINITIONS[metric];
      const ranked = rankBoard(
        input.lists[metric].filter(isLandingProject),
        (s) => boardValue(s, metric),
        (s) => s.name,
      );
      return {
        metric,
        basis: def.basis,
        period: def.period,
        rows: ranked.slice(0, boardLimit).map((s) => ({
          rank: s.rank,
          tied: s.tied,
          value: boardValue(s, metric) as number,
          project: toPublicProject(s),
        })),
      };
    }),
  };
}
