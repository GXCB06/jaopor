// Projects made by the team that runs JaoPor (owner decision 2026-10-12, product audit B2). They are
// listed and verified like any project and carry a "ผลงานของทีม JaoPor" label, but they never take
// part in a competition: no leaderboard (MRR, revenue, visitors, commits), no project rank, and no
// province score or province rank in the Olympics. Published-project counts (directory totals,
// "N ผลงาน" on a province page, SEO / sitemap) still include them: being listed is not competing.
// By slug, so the rule is visible in code review; renaming the project means updating this list.

export const TEAM_PROJECT_SLUGS: ReadonlySet<string> = new Set(["jaopor"]);

export function isTeamProject(slug: string | null | undefined): boolean {
  return !!slug && TEAM_PROJECT_SLUGS.has(slug);
}

/**
 * The one gate for every competition (leaderboards, project rank, Olympics): published, not a demo
 * (made-up numbers), not the team's own project. Each board then adds its own value rules.
 */
export function isRankEligible(row: {
  slug?: string | null;
  status: string;
  is_demo: boolean;
}): boolean {
  return row.status === "published" && !row.is_demo && !isTeamProject(row.slug);
}
