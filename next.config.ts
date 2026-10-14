import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// The marketing landing is a separate project on its own domain (jaopor-landing.vercel.app). This
// app owns jaopor.vercel.app, so `/` redirects to the default locale (`/th`) and serves the product
// (owner 2026-10-13: the landing is not served from the main domain). The landing still reads live
// numbers from this app's `GET /api/public/landing`.
const nextConfig: NextConfig = {
  // Logos/avatars are tiny and come from Supabase Storage / OAuth providers; skip the optimizer
  // (no remote-pattern allowlist to maintain, no image-optimization quota on the free tier).
  images: { unoptimized: true },
};

export default withNextIntl(nextConfig);
