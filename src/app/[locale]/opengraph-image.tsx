import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import { logoTileDataUri } from "@/lib/logo";
import { publicEnv } from "@/lib/public-env";
import { BRAND_HEX, CARD_THEME } from "@/lib/share-palette";

// Design.md §9: the site-wide share card (home, directory, login…). Startup profiles override it
// with their own opengraph-image. Without it, a shared home link showed no preview on Facebook.

export const alt = "JaoPor";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const C = { ...CARD_THEME.dark, brand: BRAND_HEX };

const font = (file: string) =>
  readFile(join(process.cwd(), "src/assets/fonts", file));

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [t, tile, plexThai, plexThaiBold, plexLatin, plexLatinBold] =
    await Promise.all([
      getTranslations({ locale, namespace: "Home" }),
      logoTileDataUri(),
      font("ibm-plex-sans-thai-thai-400-normal.woff"),
      font("ibm-plex-sans-thai-thai-700-normal.woff"),
      font("ibm-plex-sans-thai-latin-400-normal.woff"),
      font("ibm-plex-sans-thai-latin-700-normal.woff"),
    ]);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: 28,
        background: C.bg,
        color: C.fg,
        fontFamily: "Plex",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- rendered by the OG renderer */}
        <img src={tile} width={96} height={96} alt="" />
        <span style={{ fontSize: 56, fontWeight: 700 }}>JaoPor</span>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          fontSize: 60,
          fontWeight: 700,
          lineHeight: 1.3,
        }}
      >
        <span>{t("headline1")}</span>
        <span style={{ color: C.brand }}>{t("headline2")}</span>
      </div>
      <span style={{ fontSize: 26, color: C.faint }}>
        {new URL(publicEnv.siteUrl).host}
      </span>
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
