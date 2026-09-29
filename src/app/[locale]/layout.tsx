import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Inconsolata, IBM_Plex_Sans_Thai } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Toaster } from "@/components/ui/sonner";
import { routing } from "@/i18n/routing";
import { publicEnv } from "@/lib/public-env";
import { cn } from "@/lib/utils";
import "../globals.css";

// Design.md → Typography: monospace UI font, Thai glyphs fall back to Plex Sans Thai.
const inconsolata = Inconsolata({
  subsets: ["latin"],
  variable: "--font-inconsolata",
});

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
  return {
    metadataBase: new URL(publicEnv.siteUrl),
    title: { default: t("title"), template: "%s · MRRMafia" },
    description: t("description"),
  };
}

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html
      lang={locale}
      className={cn(
        "dark h-full antialiased",
        inconsolata.variable,
        plexThai.variable,
      )}
    >
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider>
          <SiteHeader />
          <div className="flex flex-1 flex-col">{children}</div>
          <SiteFooter />
          <Toaster theme="dark" position="bottom-center" />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
