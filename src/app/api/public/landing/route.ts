import { NextResponse } from "next/server";
import { getThbPerUsd } from "@/lib/data/fx";
import {
  BOARD_METRICS,
  countStartups,
  getBoard,
  getCategoryCounts,
  getRecent,
  type StartupRow,
} from "@/lib/data/startups";
import { buildLandingPayload, type LandingSource } from "@/lib/public-landing";

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
