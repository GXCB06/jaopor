import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// Multi-zone (Next.js docs: multi-zones): the marketing landing is its own project, served by this
// domain at `/`. Its assets live under `/landing` (its assetPrefix), so they never clash with this
// app's `/_next`; the landing's share card is `/landing/og`.
const LANDING = (
  process.env.LANDING_ORIGIN ?? "https://jaopor-landing.vercel.app"
).replace(/\/$/, "");

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/", destination: `${LANDING}/` },
        {
          source: "/landing/:path*",
          destination: `${LANDING}/landing/:path*`,
        },
      ],
    };
  },
  // Logos/avatars are tiny and come from Supabase Storage / OAuth providers; skip the optimizer
  // (no remote-pattern allowlist to maintain, no image-optimization quota on the free tier).
  images: { unoptimized: true },
};

export default withNextIntl(nextConfig);
