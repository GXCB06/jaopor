// Projects made by the team that runs JaoPor (owner decision 2026-10-12, product audit B2). They are
// listed and verified like any project, carry a "ผลงานของทีม JaoPor" label, and never rank on the
// leaderboards: a platform that puts its own project at #1 reads as self-promotion. By slug, so the
// rule is visible in code review; renaming the project means updating this list.

export const TEAM_PROJECT_SLUGS: ReadonlySet<string> = new Set(["jaopor"]);

export function isTeamProject(slug: string | null | undefined): boolean {
  return !!slug && TEAM_PROJECT_SLUGS.has(slug);
}
