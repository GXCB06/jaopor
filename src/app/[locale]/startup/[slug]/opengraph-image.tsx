import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import { isAnonymousSlug } from "@/lib/anonymous";
import { getStartupBySlug } from "@/lib/data/startups";
import { publicEnv } from "@/lib/public-env";
import { shareMetrics, verifiedSources } from "@/lib/share";
import { logoTileDataUri } from "@/lib/logo";
import { OG_MONO, OG_SANS, ogFonts } from "@/lib/og-fonts";
import { logoDataUri, ogCoverDataUri } from "@/lib/og-images";
import { BRAND_HEX, CARD_THEME, HERO_HEX } from "@/lib/share-palette";

// Design.md §9 OG image: the card people see when a profile link is pasted into Facebook/LINE/X.
// 1200×630, dark, laid out like the profile page (2026-10-12): the cover as a band across the top
// (the cover screenshot, else the hero-blue gradient), the logo overlapping it, name + tagline,
// then up to 3 verified numbers + sources. Thai via IBM Plex Sans Thai, numbers in mono.

export const alt = "JaoPor";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 300;

// The OG renderer has no CSS variables: the shared renderer palette mirrors the dark tokens.
const C = { ...CARD_THEME.dark, brand: BRAND_HEX };
/** Cover band height; the logo overlaps its bottom edge like on the page. */
const BAND = 270;
const LOGO = 140;
const SIDE = 56;

/** Cut at a word (or Thai syllable run) boundary when one is close, with an ellipsis. */
function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const [found, t, card, fonts, tile, an, profile] = await Promise.all([
    getStartupBySlug(slug),
    getTranslations({ locale, namespace: "Share" }),
    getTranslations({ locale, namespace: "Card" }),
    ogFonts(),
    logoTileDataUri(),
    getTranslations({ locale, namespace: "Anonymous" }),
    getTranslations({ locale, namespace: "Profile" }),
  ]);
  // Anonymous projects (Design.md §5): the localized label, and never a screenshot as cover.
  const anonymous = isAnonymousSlug(found?.slug);
  const startup = found && anonymous ? { ...found, name: an("name") } : found;

  const cover =
    startup && !anonymous
      ? await ogCoverDataUri(startup.id, { width: 1200, height: BAND })
      : null;
  const metrics = startup ? shareMetrics(startup) : [];
  const sources = startup ? verifiedSources(startup) : [];
  // Any logo format (WebP included) is converted to PNG for the renderer.
  const logo = startup ? await logoDataUri(startup.logo_path) : null;
  const host = new URL(publicEnv.siteUrl).host;
  const gradient =
    "linear-gradient(135deg, " +
    `${HERO_HEX.from} 0%, ${HERO_HEX.via} 55%, ${HERO_HEX.to} 100%)`;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: C.bg,
        color: C.fg,
        fontFamily: OG_SANS,
        position: "relative",
      }}
    >
      {/* Cover band: the screenshot, else the hero gradient. */}
      {cover ? (
        // eslint-disable-next-line @next/next/no-img-element -- rendered by the OG renderer
        <img
          src={cover}
          width={1200}
          height={BAND}
          alt=""
          style={{ position: "absolute", top: 0, left: 0 }}
        />
      ) : (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 1200,
            height: BAND,
            background: gradient,
            opacity: 0.55,
          }}
        />
      )}
      {/* A readable header on top, fading into the card at the bottom. */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 1200,
          height: BAND,
          background:
            "linear-gradient(180deg, rgba(10,10,11,0.55) 0%, rgba(10,10,11,0.15) 40%, rgba(10,10,11,1) 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 40,
          left: SIDE,
          right: SIDE,
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- rendered by the OG renderer */}
        <img src={tile} width={44} height={44} alt="" />
        <span style={{ fontSize: 30, fontWeight: 700 }}>JaoPor</span>
        {startup?.founding_number ? (
          <span
            style={{
              marginLeft: "auto",
              fontSize: 22,
              fontWeight: 700,
              color: C.fg,
              background: "rgba(10,10,11,0.6)",
              border: `2px solid ${C.brand}`,
              borderRadius: 10,
              padding: "4px 14px",
            }}
          >
            {card("foundingBadge", { n: startup.founding_number })}
          </span>
        ) : null}
      </div>

      {/* The logo overlaps the band, with a ring in the card colour. */}
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element -- rendered by the OG renderer, not the browser
        <img
          src={logo}
          width={LOGO}
          height={LOGO}
          alt=""
          style={{
            position: "absolute",
            left: SIDE,
            top: BAND - LOGO / 2,
            borderRadius: 32,
            border: `8px solid ${C.bg}`,
            background: C.card,
          }}
        />
      ) : (
        <div
          style={{
            position: "absolute",
            left: SIDE,
            top: BAND - LOGO / 2,
            width: LOGO,
            height: LOGO,
            borderRadius: 32,
            background: C.card,
            border: `8px solid ${C.bg}`,
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

      {/* Name + tagline beside the logo, under the band. */}
      <div
        style={{
          position: "absolute",
          left: SIDE + LOGO + 28,
          right: SIDE,
          top: BAND + 14,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <span style={{ fontSize: 58, fontWeight: 700, lineHeight: 1.1 }}>
          {startup?.name ?? "JaoPor"}
        </span>
        {startup?.tagline ? (
          <span
            style={{
              fontSize: 26,
              color: C.muted,
              marginTop: 8,
              lineHeight: 1.35,
            }}
          >
            {clip(startup.tagline, 70)}
          </span>
        ) : null}
      </div>

      <div
        style={{
          position: "absolute",
          left: SIDE,
          right: SIDE,
          bottom: 36,
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
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
                  padding: "14px 24px",
                }}
              >
                <span style={{ fontSize: 22, color: C.muted }}>
                  {t(`metric.${m.id}`)}
                </span>
                <span
                  style={{ fontSize: 48, fontWeight: 700, fontFamily: OG_MONO }}
                >
                  {m.value}
                </span>
              </div>
            ))}
          </div>
        ) : (
          // The same words as the page's early-stage card.
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              alignSelf: "flex-start",
              fontSize: 26,
              fontWeight: 700,
              background: C.card,
              border: `2px solid ${C.border}`,
              borderRadius: 999,
              padding: "10px 24px",
            }}
          >
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: 999,
                background: C.positive,
              }}
            />
            {profile("early.title")}
          </span>
        )}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 22,
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
      fonts,
    },
  );
}
