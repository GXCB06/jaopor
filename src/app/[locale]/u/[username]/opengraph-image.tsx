import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import { getProfileCard } from "@/lib/data/builder";
import { getThbPerUsd } from "@/lib/data/fx";
import { money } from "@/lib/format";
import { logoTileDataUri } from "@/lib/logo";
import { OG_MONO, OG_SANS, ogFonts } from "@/lib/og-fonts";
import { avatarDataUri } from "@/lib/og-images";
import { publicEnv } from "@/lib/public-env";
import { BRAND_HEX, CARD_THEME } from "@/lib/share-palette";

// Design.md §9 OG image, builder variant: avatar, name, headline, status and the verified revenue
// summed over the builder's works. Only what an anonymous visitor may see.

export const alt = "JaoPor";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 300;

const C = { ...CARD_THEME.dark, brand: BRAND_HEX };

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string; username: string }>;
}) {
  const { locale, username } = await params;
  const handle = username.toLowerCase();
  const [card, t, thbPerUsd, fonts, tile] = await Promise.all([
    getProfileCard(handle),
    getTranslations({ locale, namespace: "Builder" }),
    getThbPerUsd(),
    ogFonts(),
    logoTileDataUri(),
  ]);

  const profile = card?.profile ?? null;
  const avatar = await avatarDataUri(profile?.avatar_url ?? null);
  const name = profile?.display_name ?? profile?.handle ?? "JaoPor";
  const host = new URL(publicEnv.siteUrl).host;
  const status =
    profile && profile.status !== "busy"
      ? t(`status.${profile.status}` as "status.networking")
      : null;

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
        fontFamily: OG_SANS,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- rendered by the OG renderer */}
        <img src={tile} width={44} height={44} alt="" />
        <span style={{ fontSize: 30, fontWeight: 700 }}>JaoPor</span>
        {status ? (
          <span
            style={{
              marginLeft: "auto",
              fontSize: 22,
              fontWeight: 700,
              color: C.positive,
              border: `2px solid ${C.positive}`,
              borderRadius: 999,
              padding: "4px 16px",
            }}
          >
            {status}
          </span>
        ) : null}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 36 }}>
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element -- rendered by the OG renderer
          <img
            src={avatar}
            width={160}
            height={160}
            style={{ borderRadius: 999, border: `4px solid ${C.border}` }}
            alt=""
          />
        ) : (
          <div
            style={{
              width: 160,
              height: 160,
              borderRadius: 999,
              background: C.card,
              border: `4px solid ${C.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 72,
              fontWeight: 700,
            }}
          >
            {name.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div
          style={{ display: "flex", flexDirection: "column", maxWidth: 840 }}
        >
          <span style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.1 }}>
            {name.slice(0, 40)}
          </span>
          <span style={{ fontSize: 28, color: C.muted, marginTop: 8 }}>
            @{profile?.handle ?? handle}
          </span>
          {profile?.headline ? (
            <span style={{ fontSize: 30, marginTop: 14, lineHeight: 1.4 }}>
              {profile.headline.slice(0, 90)}
            </span>
          ) : null}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 24,
        }}
      >
        {card && card.mrrCents > 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              background: C.card,
              border: `2px solid ${C.border}`,
              borderRadius: 16,
              padding: "18px 24px",
            }}
          >
            <span style={{ fontSize: 22, color: C.muted }}>
              {t("ogVerifiedMrr")}
            </span>
            <span
              style={{ fontSize: 56, fontWeight: 700, fontFamily: OG_MONO }}
            >
              {money(card.mrrCents, {
                currency: locale === "th" ? "thb" : "usd",
                thbPerUsd,
              })}
            </span>
          </div>
        ) : (
          <span style={{ fontSize: 26, color: C.muted }}>
            {card?.works ? t("ogWorks", { n: card.works }) : t("ogNoNumbers")}
          </span>
        )}
        <span style={{ fontSize: 24, color: C.muted }}>
          {host}/@{profile?.handle ?? handle}
        </span>
      </div>
    </div>,
    {
      ...size,
      fonts,
    },
  );
}
