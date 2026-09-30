import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import { REGION_PATH } from "@/components/olympics/ThailandMap";
import { localizedName } from "@/lib/config/localized";
import { REGION_LIST, getProvince } from "@/lib/config/provinces";
import { getThbPerUsd } from "@/lib/data/fx";
import { getProvinceLeaderboard } from "@/lib/data/startups";
import { money } from "@/lib/format";
import { logoTileDataUri } from "@/lib/logo";
import { DEFAULT_METRIC, regionStandings } from "@/lib/olympics";
import { publicEnv } from "@/lib/public-env";
import { BRAND_HEX, CARD_THEME, REGION_HEX } from "@/lib/share-palette";

// Design.md §9 Olympics share card: the podium (top 3 provinces by verified revenue, "ที่ว่าง" for
// open places) + the map with the regions that compete. What a shared /olympics link shows.

export const alt = "JaoPor Olympics";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const C = { ...CARD_THEME.dark, brand: BRAND_HEX };
const MEDAL = ["#f59e0b", "#a1a1a6", "#b45309"];

const font = (file: string) =>
  readFile(join(process.cwd(), "src/assets/fonts", file));

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [
    t,
    tile,
    ranked,
    thbPerUsd,
    plexThai,
    plexThaiBold,
    plexLatin,
    plexLatinBold,
  ] = await Promise.all([
    getTranslations({ locale, namespace: "Olympics" }),
    logoTileDataUri(),
    getProvinceLeaderboard(DEFAULT_METRIC).catch(() => []),
    getThbPerUsd(),
    font("ibm-plex-sans-thai-thai-400-normal.woff"),
    font("ibm-plex-sans-thai-thai-700-normal.woff"),
    font("ibm-plex-sans-thai-latin-400-normal.woff"),
    font("ibm-plex-sans-thai-latin-700-normal.woff"),
  ]);
  const active = regionStandings(ranked)
    .filter((r) => r.provinces > 0)
    .map((r) => r.region);

  // "฿" lives only in the Thai subset: render it in its own family (see the share-card route).
  const amount = (cents: number) => {
    const s = money(cents, { currency: "thb", thbPerUsd });
    return s.startsWith("฿") ? (
      <span style={{ display: "flex" }}>
        <span style={{ fontFamily: "Baht", fontWeight: 400 }}>฿</span>
        {s.slice(1)}
      </span>
    ) : (
      s
    );
  };

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 80px",
        background: C.bg,
        color: C.fg,
        fontFamily: "Plex",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- rendered by the OG renderer */}
          <img src={tile} width={52} height={52} alt="" />
          <span style={{ fontSize: 30, fontWeight: 700 }}>JaoPor</span>
          <span style={{ fontSize: 24, color: C.brand, fontWeight: 700 }}>
            · {t("eyebrow", { year: new Date().getFullYear() })}
          </span>
        </div>
        <span style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.1 }}>
          {t("title")}
        </span>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[0, 1, 2].map((i) => {
            const row = ranked[i];
            const p = row ? getProvince(row.province) : undefined;
            return (
              <div
                key={i}
                style={{ display: "flex", alignItems: "center", gap: 18 }}
              >
                <span
                  style={{
                    display: "flex",
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    border: `4px solid ${MEDAL[i]}`,
                    color: MEDAL[i],
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 22,
                    fontWeight: 700,
                  }}
                >
                  {i + 1}
                </span>
                <span
                  style={{
                    fontSize: 38,
                    fontWeight: 700,
                    color: p ? C.fg : C.faint,
                    minWidth: 330,
                  }}
                >
                  {p ? localizedName(p, locale) : t("openSpot")}
                </span>
                {row && (
                  <span
                    style={{ fontSize: 34, fontWeight: 700, color: C.muted }}
                  >
                    {amount(row.total)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <span style={{ fontSize: 24, color: C.faint }}>
          {new URL(publicEnv.siteUrl).host}/olympics
        </span>
      </div>
      <svg width={280} height={500} viewBox="0 0 84 150">
        {REGION_LIST.map((r) => (
          <path
            key={r.slug}
            d={REGION_PATH[r.slug]}
            fill={active.includes(r.slug) ? REGION_HEX[r.slug] : C.border}
            stroke={C.bg}
            strokeWidth={1}
            strokeLinejoin="round"
          />
        ))}
      </svg>
    </div>,
    {
      ...size,
      fonts: [
        { name: "Plex", data: plexLatin, weight: 400, style: "normal" },
        { name: "Plex", data: plexLatinBold, weight: 700, style: "normal" },
        { name: "Plex", data: plexThai, weight: 400, style: "normal" },
        { name: "Plex", data: plexThaiBold, weight: 700, style: "normal" },
        { name: "Baht", data: plexThai, weight: 400, style: "normal" },
      ],
    },
  );
}
