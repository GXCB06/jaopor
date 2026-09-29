import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Logos/avatars are tiny and come from Supabase Storage / OAuth providers; skip the optimizer
  // (no remote-pattern allowlist to maintain, no image-optimization quota on the free tier).
  images: { unoptimized: true },
};

export default withNextIntl(nextConfig);
