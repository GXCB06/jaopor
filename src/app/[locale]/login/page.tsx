import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BrandMark } from "@/components/BrandLogo";
import { LoginButtons } from "@/components/LoginButtons";
import { loginReason, safeNextPath } from "@/lib/next-path";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/login">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Login" });
  return { title: t("title"), robots: { index: false } };
}

export default async function LoginPage({
  params,
  searchParams,
}: PageProps<"/[locale]/login">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const t = await getTranslations("Login");

  // Where to go after sign-in is decided by the callback (Design.md §6 Sign-in routing).
  const next = safeNextPath(typeof sp.next === "string" ? sp.next : null);
  const reason = loginReason(next);

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <BrandMark className="size-10" />
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">
          {/* C-9 / A1.1: say why they're here (adding a project, contacting a builder). */}
          {reason === "add"
            ? t("titleAdd")
            : reason === "contact"
              ? t("titleContact")
              : t("title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>
      {sp.error && <p className="text-sm text-destructive">{t("error")}</p>}
      <LoginButtons next={next} locale={locale} />
      <p className="text-xs text-muted-foreground">{t("legal")}</p>
    </main>
  );
}
