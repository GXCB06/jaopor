import type { MetadataRoute } from "next";
import { publicEnv } from "@/lib/public-env";

// Design.md §4 SEO (product audit 2026-10-12): crawl the public pages, skip the signed-in and API
// areas, and point crawlers at the sitemap.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/*/dashboard",
        "/*/new",
        "/*/onboarding",
        "/*/login",
      ],
    },
    sitemap: `${publicEnv.siteUrl}/sitemap.xml`,
  };
}
