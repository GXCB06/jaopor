import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import {
  getRevenueSeries,
  getStartupBySlug,
  getVisitorSeries,
  type StartupRow,
} from "@/lib/data/startups";
import { moneyCompact, moneyFull } from "@/lib/format";
import { LOGO_SMALL_HAT, LOGO_TILE } from "@/lib/logo";
import { shareMetrics } from "@/lib/share";
import {
  bucketMonthly,
  chartPaths,
  heatLevels,
  parseCardQuery,
  weekColumns,
  type Point,
} from "@/lib/share-card";
import { CARD_THEME, SWATCHES } from "@/lib/share-palette";

// Design.md §5 ShareStudio images: Badge / Chart / Calendar PNGs of a project's VERIFIED numbers.
// Every query parameter is validated against fixed lists (parseCardQuery); colours are swatch
// ids, never caller-supplied values. Public data only (the same numbers the profile shows).

export const revalidate = 300;

const font = (file: string) =>
  readFile(join(process.cwd(), "src/assets/fonts", file));

type Series = {
  metric: "revenue" | "visitors";
  points: Point[];
};

/** Revenue (Stripe daily snapshots) first, then verified visitors; null when neither exists. */
async function loadSeries(s: StartupRow, days: number): Promise<Series | null> {
  if (s.is_demo) return null; // sample data never goes on a share image
  if (
    s.verification_status === "verified" &&
    s.verified_provider === "stripe"
  ) {
    const pts = await getRevenueSeries(s.id, days);
    return {
      metric: "revenue",
      points: pts.map((p) => ({ day: p.day, value: p.revenueCents })),
    };
  }
  if (s.visitors_30d !== null) {
    return { metric: "visitors", points: await getVisitorSeries(s.id, days) };
  }
  return null;
}

const fmt = (metric: Series["metric"], v: number, full = false) =>
  metric === "revenue"
    ? full
      ? moneyFull(v)
      : moneyCompact(v)
    : new Intl.NumberFormat("en", {
        notation: full ? "standard" : "compact",
      }).format(v);

export async function GET(
  req: Request,
  ctx: RouteContext<"/api/share-card/[slug]">,
) {
  const { slug } = await ctx.params;
  const q = parseCardQuery(new URL(req.url).searchParams);
  const startup = /^[a-z0-9-]{1,50}$/.test(slug)
    ? await getStartupBySlug(slug).catch(() => null)
    : null;
  if (!startup) return new Response("Not found", { status: 404 });

  const C = CARD_THEME[q.theme];
  const accent = SWATCHES[q.color];
  const days = q.kind === "calendar" ? Math.round(q.period * 30.4) : q.period;
  const [t, series, plex, plexBold, plexThai, plexThaiBold, mono] =
    await Promise.all([
      getTranslations({ locale: q.locale, namespace: "ShareCard" }),
      q.kind === "badge" ? Promise.resolve(null) : loadSeries(startup, days),
      font("ibm-plex-sans-thai-latin-400-normal.woff"),
      font("ibm-plex-sans-thai-latin-700-normal.woff"),
      font("ibm-plex-sans-thai-thai-400-normal.woff"),
      font("ibm-plex-sans-thai-thai-700-normal.woff"),
      font("inconsolata-latin-700-normal.woff"),
    ]);

  const verifiedLine = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        color: C.faint,
        fontSize: 18,
      }}
    >
      <svg width="20" height="20" viewBox="0 0 64 64">
        <rect width="64" height="64" rx="14" fill={LOGO_TILE} />
        <path d={LOGO_SMALL_HAT} fill="#ffffff" />
        <rect x="3" y="39" width="58" height="10" rx="5" fill="#ffffff" />
      </svg>
      {t("verifiedBy")}
    </div>
  );

  const nameChip = (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          background: accent,
          color: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 20,
          fontWeight: 700,
        }}
      >
        {startup.name.slice(0, 1).toUpperCase()}
      </div>
      <span style={{ fontSize: 24, fontWeight: 700 }}>
        {startup.name.slice(0, 28)}
      </span>
    </div>
  );

  let body: React.ReactElement;
  let size = { width: 1200, height: 630 };

  if (q.kind === "badge") {
    size = { width: 900, height: 340 };
    const m = shareMetrics(startup, 1)[0];
    body = (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 36,
          background: C.card,
          border: `2px solid ${C.border}`,
          borderRadius: 32,
          padding: "44px 56px",
          width: "100%",
        }}
      >
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: 60,
            background: accent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#ffffff",
            fontSize: 64,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {startup.name.slice(0, 1).toUpperCase()}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span
            style={{
              fontSize: 20,
              letterSpacing: 2,
              color: C.faint,
              textTransform: "uppercase",
            }}
          >
            {m
              ? `${startup.name.slice(0, 24)} · ${t(`metric.${m.id}`)}`
              : startup.name.slice(0, 32)}
          </span>
          <span
            style={{
              fontSize: m ? 84 : 44,
              fontWeight: 700,
              fontFamily: "Mono",
              lineHeight: 1.05,
            }}
          >
            {m ? m.value : t("notVerified")}
          </span>
          {verifiedLine}
        </div>
      </div>
    );
  } else if (!series) {
    body = (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: C.card,
          border: `2px solid ${C.border}`,
          borderRadius: 32,
          padding: 56,
          width: "100%",
          height: "100%",
        }}
      >
        {nameChip}
        <span style={{ fontSize: 40, color: C.muted }}>{t("notVerified")}</span>
        {verifiedLine}
      </div>
    );
  } else {
    const monthly = q.kind === "chart" && q.period === 365;
    const pts = monthly ? bucketMonthly(series.points) : series.points;
    const total = series.points.reduce((a, p) => a + p.value, 0);
    const periodLabel =
      q.kind === "calendar"
        ? t("lastMonths", { n: q.period })
        : q.period === 365
          ? t("lastMonths", { n: 12 })
          : t("lastDays", { n: q.period });
    const header = (
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 64, fontWeight: 700, fontFamily: "Mono" }}>
            {fmt(series.metric, total, true)}
          </span>
          <span style={{ fontSize: 22, color: C.faint }}>
            {t(series.metric === "revenue" ? "revenueIn" : "visitorsIn", {
              period: periodLabel,
            })}
          </span>
        </div>
        {nameChip}
      </div>
    );

    let plot: React.ReactElement;
    if (q.kind === "chart") {
      const W = 1000;
      const H = 300;
      const values = pts.map((p) => p.value);
      const { line, area, max } = chartPaths(values, W, H);
      plot = (
        <div style={{ display: "flex", gap: 16 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              height: H,
              fontSize: 16,
              color: C.faint,
              width: 70,
            }}
          >
            <span>{fmt(series.metric, max)}</span>
            <span>{fmt(series.metric, max / 2)}</span>
            <span>{fmt(series.metric, 0)}</span>
          </div>
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
            <line x1="0" y1="0" x2={W} y2="0" stroke={C.grid} />
            <line x1="0" y1={H / 2} x2={W} y2={H / 2} stroke={C.grid} />
            <line x1="0" y1={H} x2={W} y2={H} stroke={C.grid} />
            <path d={area} fill={accent} fillOpacity="0.18" />
            <path
              d={line}
              fill="none"
              stroke={accent}
              strokeWidth="4"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      );
    } else {
      const cols = weekColumns(pts);
      const levels = heatLevels(pts.map((p) => p.value));
      const levelOf = new Map(pts.map((p, i) => [p.day, levels[i]]));
      const cell = Math.min(
        22,
        Math.floor(1000 / Math.max(cols.length, 1)) - 4,
      );
      const opacity = [0, 0.3, 0.55, 0.8, 1];
      plot = (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", gap: 4 }}>
            {cols.map((col, ci) => (
              <div
                key={ci}
                style={{ display: "flex", flexDirection: "column", gap: 4 }}
              >
                {col.map((p, ri) => {
                  const lvl = p ? (levelOf.get(p.day) ?? 0) : -1;
                  return (
                    <div
                      key={ri}
                      style={{
                        width: cell,
                        height: cell,
                        borderRadius: 4,
                        background: lvl <= 0 ? C.grid : accent,
                        opacity: lvl < 0 ? 0 : lvl === 0 ? 1 : opacity[lvl],
                      }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 16,
              color: C.faint,
            }}
          >
            {t("less")}
            {[0, 1, 2, 3, 4].map((l) => (
              <div
                key={l}
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 3,
                  background: l === 0 ? C.grid : accent,
                  opacity: l === 0 ? 1 : opacity[l],
                }}
              />
            ))}
            {t("more")}
          </div>
        </div>
      );
    }

    body = (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: C.card,
          border: `2px solid ${C.border}`,
          borderRadius: 32,
          padding: 48,
          width: "100%",
          height: "100%",
        }}
      >
        {header}
        {plot}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          {verifiedLine}
        </div>
      </div>
    );
  }

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: C.bg,
        color: C.fg,
        padding: 32,
        fontFamily: "Plex",
      }}
    >
      {body}
    </div>,
    {
      ...size,
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=300",
        "X-Content-Type-Options": "nosniff",
      },
      fonts: [
        { name: "Plex", data: plex, weight: 400, style: "normal" },
        { name: "Plex", data: plexBold, weight: 700, style: "normal" },
        { name: "Plex", data: plexThai, weight: 400, style: "normal" },
        { name: "Plex", data: plexThaiBold, weight: 700, style: "normal" },
        { name: "Mono", data: mono, weight: 700, style: "normal" },
      ],
    },
  );
}
