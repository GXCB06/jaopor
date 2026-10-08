import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { IBM_Plex_Sans_Thai, JetBrains_Mono } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from "next-intl/server";
import { LivePresenceProvider } from "@/components/live/LivePresence";
import { PrefsSync } from "@/components/PrefsSync";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Toaster } from "@/components/ui/sonner";
import { routing } from "@/i18n/routing";
import { publicEnv } from "@/lib/public-env";
import { currencyInitScript } from "@/lib/currency-script";
import { themeInitScript } from "@/lib/theme-script";
import { cn } from "@/lib/utils";
import "../globals.css";

// Design.md §3 Typography: JetBrains Mono (Figma), Thai glyphs fall back to Plex Sans Thai.
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
});

// JaoPor lists itself: its own visitor snippet (public/v.js) counts unique visitors to this site
// for the JaoPor listing, identified by its permanent startup id (105 since 2026-10-07: the first
// listing, 29, was deleted), never by its slug, which can change and then be taken by someone
// else. Production only; /api/collect ignores hits from any other host.
const SELF_PROJECT = "105";

const plexThai = IBM_Plex_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-thai",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  const common = await getTranslations({ locale, namespace: "Common" });
  return {
    metadataBase: new URL(publicEnv.siteUrl),
    title: { default: t("title"), template: `%s · ${common("brand")}` },
    description: t("description"),
    // Spec 6.1 / Design.md §9: every page has a full Open Graph card (Facebook shows no preview
    // without og:title/description). No og:url here: children would inherit the home URL. The image
    // comes from ./opengraph-image.tsx.
    openGraph: {
      type: "website",
      siteName: common("brand"),
      locale: locale === "th" ? "th_TH" : "en_US",
      title: t("title"),
      description: t("description"),
    },
    twitter: { card: "summary_large_image" },
  };
}

/**
 * The legal pages render on the server only, so the browser gets every message except their long
 * texts (UX audit S-16: about 25 KB less on every page). The live-map opt-out on /privacy is the one
 * client component that reads Privacy; it keeps its four strings.
 */
const SERVER_ONLY = new Set(["Privacy", "Security", "Terms"]);
const PRIVACY_CLIENT = ["liveHidden", "liveShown", "optIn", "optOut"];

function clientMessages(all: Awaited<ReturnType<typeof getMessages>>) {
  const privacy = all.Privacy as Record<string, unknown>;
  return {
    ...Object.fromEntries(
      Object.entries(all).filter(([k]) => !SERVER_ONLY.has(k)),
    ),
    Privacy: Object.fromEntries(PRIVACY_CLIENT.map((k) => [k, privacy[k]])),
  } as typeof all;
}

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    // The inline script sets data-theme/data-currency before hydration; React owns neither, so a language
    // switch (layout remount) keeps them. suppressHydrationWarning covers the attributes it adds.
    <html
      lang={locale}
      suppressHydrationWarning
      className={cn(
        "h-full antialiased",
        jetbrains.variable,
        plexThai.variable,
      )}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: themeInitScript + currencyInitScript,
          }}
        />
      </head>
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider messages={clientMessages(messages)}>
          <LivePresenceProvider>
            <PrefsSync />
            <SiteHeader />
            <div className="flex flex-1 flex-col">{children}</div>
            <SiteFooter />
            <Toaster position="bottom-center" />
          </LivePresenceProvider>
        </NextIntlClientProvider>
        {process.env.NODE_ENV === "production" && (
          <script defer src="/v.js" data-project={SELF_PROJECT} />
        )}
      </body>
    </html>
  );
}
