import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import { getStartupBySlug } from "@/lib/data/startups";
import { publicEnv } from "@/lib/public-env";
import { shareMetrics, verifiedSources } from "@/lib/share";
import { logoTileDataUri } from "@/lib/logo";
import { ogCoverDataUri } from "@/lib/og-cover";
import { BRAND_HEX, CARD_THEME } from "@/lib/share-palette";
import { logoUrl } from "@/lib/supabase/public";

// Design.md §9 OG image: the card people see when a profile link is pasted into Facebook/LINE/X.
// 1200×630, dark, name + up to 3 verified numbers + sources. Thai via IBM Plex Sans Thai,
// numbers in Inconsolata (fonts vendored in src/assets/fonts, OFL).

export const alt = "JaoPor";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 300;

// The OG renderer has no CSS variables: the shared renderer palette mirrors the dark tokens.
const C = { ...CARD_THEME.dark, brand: BRAND_HEX };

const font = (file: string) =>
  readFile(join(process.cwd(), "src/assets/fonts", file));

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const [
    startup,
    t,
    card,
    plexThai,
    plexThaiBold,
    plexLatin,
    plexLatinBold,
    mono,
    tile,
  ] = await Promise.all([
    getStartupBySlug(slug),
    getTranslations({ locale, namespace: "Share" }),
    getTranslations({ locale, namespace: "Card" }),
    font("ibm-plex-sans-thai-thai-400-normal.woff"),
    font("ibm-plex-sans-thai-thai-700-normal.woff"),
    font("ibm-plex-sans-thai-latin-400-normal.woff"),
    font("ibm-plex-sans-thai-latin-700-normal.woff"),
    font("inconsolata-latin-700-normal.woff"),
    logoTileDataUri(),
  ]);

  const cover = startup ? await ogCoverDataUri(startup.id) : null;
  const metrics = startup ? shareMetrics(startup) : [];
  const sources = startup ? verifiedSources(startup) : [];
  const logo = startup ? logoUrl(startup.logo_path, { absolute: true }) : null;
  // The renderer can't decode WebP; those logos fall back to the initial.
  const logoOk = logo && !/\.webp$/i.test(logo);
  const host = new URL(publicEnv.siteUrl).host;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: C.bg,
        color: C.fg,
        padding: 64,
        fontFamily: "Plex",
        position: "relative",
      }}
    >
      {cover && (
        // eslint-disable-next-line @next/next/no-img-element -- rendered by the OG renderer
        <img
          src={cover}
          width={1200}
          height={630}
          alt=""
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 1200,
            height: 630,
          }}
        />
      )}
      {cover && (
        // Darken so the name and numbers stay readable on any screenshot.
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 1200,
            height: 630,
            background:
              "linear-gradient(180deg, rgba(10,10,11,0.78) 0%, rgba(10,10,11,0.9) 55%, rgba(10,10,11,0.97) 100%)",
          }}
        />
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- rendered by the OG renderer */}
        <img src={tile} width={44} height={44} alt="" />
        <span style={{ fontSize: 30, fontWeight: 700 }}>JaoPor</span>
        {startup?.founding_number ? (
          <span
            style={{
              marginLeft: "auto",
              fontSize: 22,
              fontWeight: 700,
              color: C.brand,
              border: `2px solid ${C.brand}`,
              borderRadius: 10,
              padding: "4px 14px",
            }}
          >
            {card("foundingBadge", { n: startup.founding_number })}
          </span>
        ) : null}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
        {logoOk ? (
          // eslint-disable-next-line @next/next/no-img-element -- rendered by the OG renderer, not the browser
          <img
            src={logo}
            width={128}
            height={128}
            style={{ borderRadius: 24 }}
            alt=""
          />
        ) : (
          <div
            style={{
              width: 128,
              height: 128,
              borderRadius: 24,
              background: C.card,
              border: `2px solid ${C.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 64,
              fontWeight: 700,
            }}
          >
            {(startup?.name ?? "J").slice(0, 1).toUpperCase()}
          </div>
        )}
        <div
          style={{ display: "flex", flexDirection: "column", maxWidth: 880 }}
        >
          <span style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.1 }}>
            {startup?.name ?? "JaoPor"}
          </span>
          {startup?.tagline ? (
            <span
              style={{
                fontSize: 30,
                color: C.muted,
                marginTop: 12,
                lineHeight: 1.4,
              }}
            >
              {startup.tagline.slice(0, 90)}
            </span>
          ) : null}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {metrics.length ? (
          <div style={{ display: "flex", gap: 20 }}>
            {metrics.map((m) => (
              <div
                key={m.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  flex: 1,
                  background: C.card,
                  border: `2px solid ${C.border}`,
                  borderRadius: 16,
                  padding: "18px 24px",
                }}
              >
                <span style={{ fontSize: 22, color: C.muted }}>
                  {t(`metric.${m.id}`)}
                </span>
                <span
                  style={{ fontSize: 56, fontWeight: 700, fontFamily: "Mono" }}
                >
                  {m.value}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <span style={{ fontSize: 26, color: C.muted }}>
            {t("ogUnverified")}
          </span>
        )}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 24,
            color: C.muted,
          }}
        >
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              color: C.positive,
            }}
          >
            {sources.length ? (
              // The fonts have no ✓ glyph: draw it.
              <svg width="26" height="26" viewBox="0 0 24 24">
                <path
                  d="M20 6 9 17l-5-5"
                  fill="none"
                  stroke={C.positive}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : null}
            {sources.length
              ? t("ogVerifiedVia", { sources: sources.join(" · ") })
              : ""}
          </span>
          <span>
            {host}/{locale}/startup/{slug}
          </span>
        </div>
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { name: "Plex", data: plexLatin, weight: 400, style: "normal" },
        { name: "Plex", data: plexLatinBold, weight: 700, style: "normal" },
        { name: "Plex", data: plexThai, weight: 400, style: "normal" },
        { name: "Plex", data: plexThaiBold, weight: 700, style: "normal" },
        { name: "Mono", data: mono, weight: 700, style: "normal" },
      ],
    },
  );
}
