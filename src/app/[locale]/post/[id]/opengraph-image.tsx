import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import { getPost } from "@/lib/data/posts";
import { logoTileDataUri } from "@/lib/logo";
import { OG_SANS, ogFonts } from "@/lib/og-fonts";
import { avatarDataUri } from "@/lib/og-images";
import { publicEnv } from "@/lib/public-env";
import { BRAND_HEX, CARD_THEME } from "@/lib/share-palette";

// Design.md §9 OG image, post variant: author, startup, type, the first 160 characters and the
// like / comment counts. Hidden posts get the plain site card text.

export const alt = "JaoPor";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 300;

const C = { ...CARD_THEME.dark, brand: BRAND_HEX };

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const found = /^[0-9]{1,18}$/.test(id) ? await getPost(Number(id)) : null;
  const post = found && !found.hidden ? found : null;
  const [t, fonts, tile, avatar] = await Promise.all([
    getTranslations({ locale, namespace: "Posts" }),
    ogFonts(),
    logoTileDataUri(),
    avatarDataUri(post?.author.avatarUrl ?? null),
  ]);
  const host = new URL(publicEnv.siteUrl).host;
  const body = post
    ? post.body.length > 160
      ? `${post.body.slice(0, 159)}…`
      : post.body
    : "";

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
        {post ? (
          <span
            style={{
              marginLeft: "auto",
              fontSize: 22,
              fontWeight: 700,
              color: C.brand,
              border: `2px solid ${C.brand}`,
              borderRadius: 999,
              padding: "4px 16px",
            }}
          >
            {t(`types.${post.type}`)}
          </span>
        ) : null}
      </div>

      {post ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element -- rendered by the OG renderer
              <img
                src={avatar}
                width={72}
                height={72}
                style={{ borderRadius: 999 }}
                alt=""
              />
            ) : null}
            <span style={{ fontSize: 30, color: C.muted }}>
              {t("ogByline", {
                name: post.author.name,
                startup: post.startup.name,
              })}
            </span>
          </div>
          <span style={{ fontSize: 44, fontWeight: 700, lineHeight: 1.35 }}>
            {body}
          </span>
        </div>
      ) : (
        <span style={{ fontSize: 44, fontWeight: 700 }}>{t("ogFallback")}</span>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 24,
          color: C.muted,
        }}
      >
        <span>
          {post
            ? t("ogCounts", { likes: post.likes, comments: post.comments })
            : ""}
        </span>
        <span>
          {host}/{locale}/post/{id}
        </span>
      </div>
    </div>,
    {
      ...size,
      fonts,
    },
  );
}
