import { NextResponse } from "next/server";
import { getThbPerUsd } from "@/lib/data/fx";
import {
  BOARD_METRICS,
  countStartups,
  getBoard,
  getCategoryCounts,
  getChartSeries,
  getRecent,
  getStartupBySlug,
  type StartupRow,
} from "@/lib/data/startups";
import {
  buildLandingPayload,
  toLandingSeries,
  toPublicProject,
  type LandingSource,
} from "@/lib/public-landing";
import { TEAM_PROJECT_SLUGS } from "@/lib/team";

// Read-only numbers for the separate landing site. Public data only (see lib/public-landing), so
// it is cacheable at the edge and open to any origin (no cookies, no credentials).

const CORS = { "Access-Control-Allow-Origin": "*" };

// StartupRow's generated types are wider than the payload needs; the owner embed is the only
// nested shape, so a cast keeps the pure mapper free of server-only imports.
const asSource = (rows: StartupRow[]) => rows as unknown as LandingSource[];

export async function GET() {
  try {
    const [recent, counts, categories, thbPerUsd, ...lists] = await Promise.all(
      [
        getRecent(12),
        countStartups(),
        getCategoryCounts(),
        getThbPerUsd(),
        ...BOARD_METRICS.map((m) => getBoard(m, 50)),
      ],
    );
    const payload = buildLandingPayload({
      recent: asSource(recent),
      lists: Object.fromEntries(
        BOARD_METRICS.map((m, i) => [m, asSource(lists[i])]),
      ) as unknown as Parameters<typeof buildLandingPayload>[0]["lists"],
      counts,
      categories,
      thbPerUsd,
    });
    // The hero card draws the same MRR history the project page charts (exact disclosure only,
    // enforced inside getChartSeries). A failure here must not break the rest of the payload.
    const top = payload.boards.find((b) => b.metric === "mrr")?.rows[0];
    const topRow = top && lists[0].find((r) => r.slug === top.project.slug);
    const seriesOf = (row: StartupRow) =>
      getChartSeries(row, 90)
        .then((series) => toLandingSeries(row.slug, series))
        .catch(() => null);
    if (topRow) payload.topMrrSeries = await seriesOf(topRow);
    // Decision D: with nobody ranked yet, feature the team's own verified MRR, flagged as a team
    // project (never ranked). The landing reads `featured` to show it with that disclosure.
    const featuredRow =
      topRow ??
      (
        await Promise.all(
          [...TEAM_PROJECT_SLUGS].map((slug) =>
            getStartupBySlug(slug).catch(() => null),
          ),
        )
      ).find(
        (r): r is StartupRow =>
          !!r &&
          r.status === "published" &&
          !r.is_demo &&
          r.verification_status === "verified" &&
          r.mrr_cents !== null,
      );
    if (featuredRow)
      payload.featured = {
        project: toPublicProject(asSource([featuredRow])[0]),
        series: topRow ? payload.topMrrSeries : await seriesOf(featuredRow),
      };
    return NextResponse.json(payload, {
      headers: {
        ...CORS,
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "server" },
      { status: 500, headers: CORS },
    );
  }
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: { ...CORS, "Access-Control-Allow-Methods": "GET, OPTIONS" },
  });
}
