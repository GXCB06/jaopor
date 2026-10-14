import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { isAnonymousSlug } from "@/lib/anonymous";
import { categoryName, provinceName } from "@/lib/config/display";
import { getThbPerUsd } from "@/lib/data/fx";
import { getStartupBySlug } from "@/lib/data/startups";
import { money } from "@/lib/format";
import { absUrl, renderMarkdownDoc, type MdFact } from "@/lib/llms";
import { projectLinks, websiteHost } from "@/lib/links";
import { publicEnv } from "@/lib/public-env";
import { SOURCE_KIND, SOURCE_NAME, isSource } from "@/lib/sources/catalog";

// Design.md §4 SEO / launch-plan §Should-have: a Markdown twin of every public project profile, at
// `/{locale}/startup/{slug}/md`. Agents that request the HTML page with `Accept: text/markdown` are
// rewritten here by the proxy. The label set mirrors the page (Profile / Md / Anonymous messages).

export const revalidate = 60;

const LOCALES = routing.locales as readonly string[];

function notFound() {
  return new NextResponse("Not found", { status: 404 });
}

/** Localized country name for an ISO 3166 alpha-2 code ("TH" → "ไทย" / "Thailand"). */
function countryName(code: string | null, locale: string): string {
  if (!code) return "";
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

export async function GET(
  _request: Request,
  ctx: RouteContext<"/[locale]/startup/[slug]/md">,
) {
  const { locale, slug } = await ctx.params;
  if (!LOCALES.includes(locale) || !/^[a-z0-9-]{1,50}$/.test(slug)) {
    return notFound();
  }

  const startup = await getStartupBySlug(slug);
  // Demo projects carry sample numbers: never publish them as an AI-readable page.
  if (!startup || startup.is_demo) return notFound();

  const [t, md, an, format, thbPerUsd] = await Promise.all([
    getTranslations({ locale, namespace: "Profile" }),
    getTranslations({ locale, namespace: "Md" }),
    getTranslations({ locale, namespace: "Anonymous" }),
    Promise.resolve(new Intl.NumberFormat(locale)),
    locale === "th" ? getThbPerUsd() : Promise.resolve(null),
  ]);

  const verified = startup.verification_status === "verified";
  const currency = locale === "th" && thbPerUsd ? "thb" : "usd";
  const moneyStr = (cents: number) =>
    money(cents, { currency, thbPerUsd, full: true });

  // Revenue (verified) mirrors the key cards; traffic and build are counted, source-named like the
  // page's traction tiles (ProjectBlocks.tractionTiles).
  const via = (source: string | null) =>
    source === "jaopor"
      ? t("viaJaopor")
      : source === "cloudflare"
        ? t("viaCloudflare")
        : source && isSource(source)
          ? SOURCE_KIND[source] === "traffic"
            ? t("countedBy", { source: SOURCE_NAME[source] })
            : t("via", { source: SOURCE_NAME[source] })
          : null;

  const facts: MdFact[] = [];
  if (verified && startup.mrr_cents !== null) {
    facts.push({ label: t("mrr"), value: moneyStr(startup.mrr_cents) });
  }
  if (verified && startup.revenue_30d_cents !== null) {
    facts.push({
      label: t("revenue30d"),
      value: moneyStr(startup.revenue_30d_cents),
    });
  }
  if (verified && startup.revenue_all_time_cents !== null) {
    facts.push({
      label: t("allTime"),
      value: moneyStr(startup.revenue_all_time_cents),
    });
  }
  if (startup.visitors_30d !== null) {
    const stamp = via(startup.traffic_provider);
    facts.push({
      label: t("visitors30d"),
      value: `${format.format(startup.visitors_30d)}${stamp ? ` — ${stamp}` : ""}`,
    });
  }
  if (startup.active_users !== null) {
    const stamp = via("revenuecat");
    facts.push({
      label: t("activeUsers"),
      value: `${format.format(startup.active_users)}${stamp ? ` — ${stamp}` : ""}`,
    });
  }
  if (startup.build_commits !== null) {
    const stamp = via("github");
    facts.push({
      label: t("buildProof"),
      value: `${t("commits", { count: startup.build_commits })}${stamp ? ` — ${stamp}` : ""}`,
    });
  }

  const location = [
    provinceName(startup.province, locale),
    countryName(startup.country, locale),
  ]
    .filter(Boolean)
    .join(", ");
  const basics = [
    `- **${t("category")}:** ${categoryName(startup.category, locale)}`,
    location ? `- **${t("location")}:** ${location}` : "",
    startup.owner
      ? `- **${t("founder")}:** ${startup.owner.display_name ?? startup.owner.handle} (@${startup.owner.handle})`
      : "",
  ].filter(Boolean);

  const links = projectLinks(startup).map(
    ({ url }) => `- [${websiteHost(url) ?? url}](${url})`,
  );

  const sections = [
    { heading: md("details"), body: basics.join("\n") },
    { heading: t("description"), body: startup.description ?? "" },
    { heading: t("problemSolved"), body: startup.problem_solved ?? "" },
    { heading: t("valueProposition"), body: startup.value_proposition ?? "" },
    { heading: md("links"), body: links.join("\n") },
  ];

  const name = isAnonymousSlug(startup.slug) ? an("name") : startup.name;
  const htmlUrl = absUrl(
    publicEnv.siteUrl,
    `/${locale}/startup/${startup.slug}`,
  );
  const updated = (startup.last_synced_at ?? startup.updated_at).slice(0, 10);

  const body = renderMarkdownDoc({
    title: name,
    summary: startup.tagline,
    facts,
    factsHeading: t("proofTitle"),
    sections,
    footer: `${md("canonical")}: ${htmlUrl} · ${md("lastUpdated")}: ${updated}`,
  });

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control":
        "public, max-age=0, s-maxage=60, stale-while-revalidate=86400",
    },
  });
}
