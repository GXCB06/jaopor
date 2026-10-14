import { NextResponse } from "next/server";
import { routing } from "@/i18n/routing";
import { isAnonymousSlug } from "@/lib/anonymous";
import { categoryName } from "@/lib/config/display";
import { getCategoryCounts, getRecent } from "@/lib/data/startups";
import { absUrl, renderLlmsTxt, type LlmsEntry } from "@/lib/llms";
import { publicEnv } from "@/lib/public-env";

// Design.md §4 SEO / launch-plan §Should-have: `llms.txt` (<https://llmstxt.org/>) so AI agents can
// discover the catalogue. Generated from the same public data as the site; cached like the sitemap.
// The path carries a dot, so the proxy never localizes it — this handler owns `/llms.txt` directly.

export const revalidate = 3600;

const LOCALE = routing.defaultLocale;

export async function GET() {
  const base = publicEnv.siteUrl;
  const path = (p: string) => absUrl(base, `/${LOCALE}${p}`);

  const [projects, categories] = await Promise.all([
    getRecent(60).catch(() => []),
    getCategoryCounts().catch(() => ({}) as Record<string, number>),
  ]);

  const pages: LlmsEntry[] = [
    { title: "Projects", url: path("/startups"), note: "the full directory" },
    {
      title: "Builders",
      url: path("/builders"),
      note: "the people behind them",
    },
    {
      title: "Province Olympics",
      url: path("/olympics"),
      note: "provinces ranked by verified numbers",
    },
    { title: "Categories", url: path("/categories") },
    { title: "Feed", url: path("/feed"), note: "product updates" },
    {
      title: "Security",
      url: path("/security"),
      note: "how connected keys are handled",
    },
    { title: "Privacy", url: path("/privacy") },
    { title: "Terms", url: path("/terms") },
  ];

  const categoryItems: LlmsEntry[] = Object.entries(categories)
    .filter(([, n]) => n > 0)
    .map(([slug, n]) => ({
      title: categoryName(slug, "en"),
      url: path(`/category/${slug}`),
      note: `${n} project${n === 1 ? "" : "s"}`,
    }));

  const projectItems: LlmsEntry[] = projects
    .filter((s) => !s.is_demo && !isAnonymousSlug(s.slug))
    .map((s) => ({
      title: s.name,
      url: absUrl(base, `/${LOCALE}/startup/${s.slug}/md`),
      note: s.tagline ?? undefined,
    }));

  const body = renderLlmsTxt({
    title: "JaoPor",
    summary:
      "A Thailand-first directory of projects built with AI. Every public number — revenue, MRR, visitors and build proof — shows its source and when it was last checked.",
    intro:
      "JaoPor lists websites, apps, games, SaaS, LINE OA and GitHub projects made by builders in Thailand. Project profiles carry verified or counted numbers alongside the story. Each project below links to its Markdown profile; its human page is the same URL without `/md`.",
    sections: [
      { heading: "Key pages", items: pages },
      { heading: "Categories", items: categoryItems },
      { heading: "Recent projects", items: projectItems },
    ],
    footer: `More at ${path("/startups")}.`,
  });

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control":
        "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
