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
import { getThbPerUsd } from "@/lib/data/fx";
import { money } from "@/lib/format";
import { logoTileDataUri } from "@/lib/logo";
import { logoDataUri } from "@/lib/og-images";
import { badgeHeadline, projectCurrencySymbol } from "@/lib/share";
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

export async function GET(
  req: Request,
  ctx: RouteContext<"/api/share-card/[slug]">,
) {
  const { slug } = await ctx.params;
  const q = parseCardQuery(new URL(req.url).searchParams);
  const found = /^[a-z0-9-]{1,50}$/.test(slug)
    ? await getStartupBySlug(slug).catch(() => null)
    : null;
  if (!found) return new Response("Not found", { status: 404 });
  // Local design check only: `?demo=1` renders a demo project's sample numbers. Ignored in
  // production, where sample data never reaches a share image.
  const startup =
    process.env.NODE_ENV === "development" &&
    new URL(req.url).searchParams.get("demo") === "1"
      ? { ...found, is_demo: false }
      : found;

  const C = CARD_THEME[q.theme];
  // THB projects (spec 6.5 "฿ for THB startups") show money in baht at the site's rate;
  // without a rate they stay in USD rather than guess.
  const glyph = projectCurrencySymbol(startup);
  const thbPerUsd = glyph === "฿" ? await getThbPerUsd() : null;
  const currency = thbPerUsd ? "thb" : "usd";
  const fmt = (metric: Series["metric"], v: number, full = false) =>
    metric === "revenue"
      ? money(v, { currency, thbPerUsd, full })
      : new Intl.NumberFormat("en", {
          notation: full ? "standard" : "compact",
        }).format(v);
  const headlineValue = (m: NonNullable<ReturnType<typeof badgeHeadline>>) => {
    const cents =
      m.id === "revenueAllTime"
        ? startup.revenue_all_time_cents
        : m.id === "mrr"
          ? startup.mrr_cents
          : m.id === "revenue30d"
            ? startup.revenue_30d_cents
            : null;
    return cents !== null && thbPerUsd
      ? money(cents, { currency: "thb", thbPerUsd })
      : m.value;
  };
  const accent = SWATCHES[q.color];
  const days = q.kind === "calendar" ? Math.round(q.period * 30.4) : q.period;
  const [t, series, plex, plexBold, plexThai, plexThaiBold, mono, tile, logo] =
    await Promise.all([
      getTranslations({ locale: q.locale, namespace: "ShareCard" }),
      q.kind === "badge" ? Promise.resolve(null) : loadSeries(startup, days),
      font("ibm-plex-sans-thai-latin-400-normal.woff"),
      font("ibm-plex-sans-thai-latin-700-normal.woff"),
      font("ibm-plex-sans-thai-thai-400-normal.woff"),
      font("ibm-plex-sans-thai-thai-700-normal.woff"),
      font("inconsolata-latin-700-normal.woff"),
      logoTileDataUri(),
      logoDataUri(startup.logo_path),
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
      {/* eslint-disable-next-line @next/next/no-img-element -- rendered by the OG renderer */}
      <img src={tile} width={20} height={20} alt="" />
      {t("verifiedBy")}
    </div>
  );

  const logoTile = (size: number) =>
    logo ? (
      // eslint-disable-next-line @next/next/no-img-element -- rendered by the OG renderer
      <img
        src={logo}
        width={size}
        height={size}
        alt=""
        style={{ borderRadius: size / 4.5 }}
      />
    ) : (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: size / 4.5,
          background: accent,
          color: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: size * 0.55,
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {startup.name.slice(0, 1).toUpperCase()}
      </div>
    );

  const nameChip = (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      {logoTile(36)}
      <span style={{ fontSize: 24, fontWeight: 700 }}>
        {startup.name.slice(0, 28)}
      </span>
    </div>
  );

  let body: React.ReactElement;
  let size = { width: 1200, height: 630 };

  if (q.kind === "badge") {
    size = { width: 900, height: 340 };
    const m = badgeHeadline(startup);
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
        {logoTile(120)}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span
            style={{
              fontSize: 20,
              letterSpacing: 2,
              color: C.faint,
              textTransform: "uppercase",
            }}
          >
            {m ? t(`metric.${m.id}`) : startup.name.slice(0, 32)}
          </span>
          <span
            style={{
              fontSize: m ? 84 : 44,
              fontWeight: 700,
              fontFamily: "Mono",
              lineHeight: 1.05,
            }}
          >
            {m ? headlineValue(m) : t("notVerified")}
          </span>
          {m && (
            <span style={{ fontSize: 22, fontWeight: 700 }}>
              {startup.name.slice(0, 32)}
            </span>
          )}
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
      const W = 950; // card inner width 1040 − 70 axis labels − 16 gap
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
      // Bigger cells for short periods so 3 months still fills the card.
      const cell = Math.min(30, Math.floor(980 / Math.max(cols.length, 1)) - 3);
      const opacity = [1, 0.35, 0.55, 0.78, 1];
      const glyphCell = (lvl: number, key: number | string, px = cell) => (
        <div
          key={key}
          style={{
            width: px,
            height: px,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: px * 0.95,
            // "฿" only exists in the Thai subset; give it its own family so the renderer can't
            // pick the Latin file (same family name) and draw a missing-glyph box.
            fontFamily: glyph === "฿" ? "Baht" : "Mono",
            fontWeight: glyph === "฿" ? 400 : 700,
            lineHeight: 1,
            color: lvl < 0 ? "transparent" : lvl === 0 ? C.grid : accent,
            opacity: lvl <= 0 ? 1 : opacity[lvl],
          }}
        >
          {glyph}
        </div>
      );
      // Month label over the first column that contains the 1st of a month (or the first column).
      const monthFmt = new Intl.DateTimeFormat(
        q.locale === "th" ? "th-TH" : "en-US",
        { month: "short", timeZone: "UTC" },
      );
      const monthLabels = cols.map((col, ci) => {
        const first = col.find((p) => p && (p.day.endsWith("-01") || ci === 0));
        return first ? monthFmt.format(new Date(`${first.day}T00:00:00Z`)) : "";
      });
      // Rows are Sun..Sat; label Mon, Wed, Fri, Sun (spec: จ./พ./ศ./อา.).
      const dayLabel = (row: number) =>
        ({ 1: t("dayMon"), 3: t("dayWed"), 5: t("dayFri"), 0: t("daySun") })[
          row
        ] ?? "";
      plot = (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", gap: 3, paddingLeft: 44 }}>
            {monthLabels.map((m, ci) => (
              <div
                key={ci}
                style={{
                  width: cell,
                  fontSize: 15,
                  color: C.faint,
                  whiteSpace: "nowrap",
                  overflow: "visible",
                  display: "flex",
                }}
              >
                {m}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 3 }}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 3,
                width: 41,
              }}
            >
              {Array.from({ length: 7 }, (_, row) => (
                <div
                  key={row}
                  style={{
                    height: cell,
                    fontSize: 14,
                    color: C.faint,
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  {dayLabel(row)}
                </div>
              ))}
            </div>
            {cols.map((col, ci) => (
              <div
                key={ci}
                style={{ display: "flex", flexDirection: "column", gap: 3 }}
              >
                {col.map((p, ri) =>
                  glyphCell(p ? (levelOf.get(p.day) ?? 0) : -1, ri),
                )}
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
              paddingLeft: 44,
            }}
          >
            {t("less")}
            {[0, 1, 2, 3, 4].map((l) => glyphCell(l, l, 18))}
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
        { name: "Baht", data: plexThai, weight: 400, style: "normal" },
      ],
    },
  );
}
