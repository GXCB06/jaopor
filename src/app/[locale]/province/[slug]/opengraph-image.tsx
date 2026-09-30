import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import { REGION_PATH } from "@/components/olympics/ThailandMap";
import { localizedName } from "@/lib/config/localized";
import { REGION_LIST, getProvince, getRegion } from "@/lib/config/provinces";
import { getProvinceLeaderboard } from "@/lib/data/startups";
import { logoTileDataUri } from "@/lib/logo";
import { DEFAULT_METRIC, provinceRank } from "@/lib/olympics";
import { publicEnv } from "@/lib/public-env";
import { BRAND_HEX, CARD_THEME, REGION_HEX } from "@/lib/share-palette";

// Spec 6.7 province share card: "{จังหวัด} อันดับ #X ในโอลิมปิกจังหวัด" + the region map.

export const alt = "JaoPor";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const C = { ...CARD_THEME.dark, brand: BRAND_HEX };

const font = (file: string) =>
  readFile(join(process.cwd(), "src/assets/fonts", file));

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const p = getProvince(slug);
  const [t, tile, ranked, plexThai, plexThaiBold, plexLatin, plexLatinBold] =
    await Promise.all([
      getTranslations({ locale, namespace: "Province" }),
      logoTileDataUri(),
      p ? getProvinceLeaderboard(DEFAULT_METRIC).catch(() => []) : [],
      font("ibm-plex-sans-thai-thai-400-normal.woff"),
      font("ibm-plex-sans-thai-thai-700-normal.woff"),
      font("ibm-plex-sans-thai-latin-400-normal.woff"),
      font("ibm-plex-sans-thai-latin-700-normal.woff"),
    ]);
  const rank = p ? provinceRank(ranked, p.slug) : null;
  const name = p ? localizedName(p, locale) : "JaoPor";

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 96px",
        background: C.bg,
        color: C.fg,
        fontFamily: "Plex",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- rendered by the OG renderer */}
          <img src={tile} width={64} height={64} alt="" />
          <span style={{ fontSize: 36, fontWeight: 700 }}>JaoPor</span>
        </div>
        <span style={{ fontSize: 84, fontWeight: 700, lineHeight: 1.15 }}>
          {name}
        </span>
        <span style={{ fontSize: 40, fontWeight: 700, color: C.brand }}>
          {rank ? t("ogRank", { rank }) : t("ogNoRank")}
        </span>
        {p && (
          <span style={{ fontSize: 28, color: C.muted }}>
            {localizedName(getRegion(p.region), locale)} ·{" "}
            {new URL(publicEnv.siteUrl).host}
          </span>
        )}
      </div>
      <svg width={260} height={464} viewBox="0 0 84 150">
        {REGION_LIST.map((r) => (
          <path
            key={r.slug}
            d={REGION_PATH[r.slug]}
            fill={r.slug === p?.region ? REGION_HEX[r.slug] : C.border}
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
      ],
    },
  );
}
