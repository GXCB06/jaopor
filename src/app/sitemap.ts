import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { isAnonymousSlug } from "@/lib/anonymous";
import { listBuilders } from "@/lib/data/builder";
import { getCategoryCounts, getProvinceProjectCounts } from "@/lib/data/startups";
import { publicEnv } from "@/lib/public-env";
import { createPublicClient } from "@/lib/supabase/public";

// Design.md §4 SEO (product audit 2026-10-12): every public page worth finding, in Thai and English,
// each listing its other-language twin. Category and province pages only once they have a project
// (empty ones are noindex). Anonymous projects stay out. Any loader that fails just leaves its part out.

export const revalidate = 3600;

const STATIC = [
  "",
  "/startups",
  "/builders",
  "/categories",
  "/olympics",
  "/feed",
  "/security",
  "/privacy",
  "/terms",
];

async function safe<T>(p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await p;
  } catch {
    return fallback;
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = publicEnv.siteUrl;
  const [projects, builders, categories, provinces] = await Promise.all([
    safe(
      (async () => {
        const { data, error } = await createPublicClient()
          .from("startups")
          .select("slug, updated_at")
          .eq("status", "published")
          .eq("is_demo", false);
        if (error) throw error;
        return data ?? [];
      })(),
      [] as { slug: string; updated_at: string }[],
    ),
    safe(listBuilders(), []),
    safe(getCategoryCounts(), {} as Record<string, number>),
    // Listing counts, not ranks: the team project's province stays in (lib/team).
    safe(getProvinceProjectCounts(), {} as Record<string, number>),
  ]);

  const entry = (path: string, lastModified?: string): MetadataRoute.Sitemap =>
    routing.locales.map((locale) => ({
      url: `${base}/${locale}${path}`,
      ...(lastModified ? { lastModified } : {}),
      alternates: {
        languages: Object.fromEntries(
          routing.locales.map((l) => [l, `${base}/${l}${path}`]),
        ),
      },
    }));

  return [
    ...STATIC.flatMap((p) => entry(p)),
    ...projects
      .filter((s) => !isAnonymousSlug(s.slug))
      .flatMap((s) => entry(`/startup/${s.slug}`, s.updated_at)),
    ...builders.flatMap((b) => entry(`/u/${b.handle}`)),
    ...Object.entries(categories)
      .filter(([, n]) => n > 0)
      .flatMap(([slug]) => entry(`/category/${slug}`)),
    ...Object.entries(provinces)
      .filter(([, n]) => n > 0)
      .flatMap(([slug]) => entry(`/province/${slug}`)),
  ];
}
