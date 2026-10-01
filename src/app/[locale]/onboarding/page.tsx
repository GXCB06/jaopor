import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { OnboardingFlow } from "@/components/profile-edit/OnboardingFlow";
import { redirect } from "@/i18n/navigation";
import { requireUserId } from "@/lib/auth";
import { getMyProfile } from "@/lib/data/me";
import { suggestHandle } from "@/lib/profile";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/onboarding">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Me" });
  return { title: t("onb.metaTitle"), robots: { index: false } };
}

// Spec 9e onboarding: only for signed-in users without a username; anyone else goes to the
// dashboard.
export default async function OnboardingPage({
  params,
}: PageProps<"/[locale]/onboarding">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const userId = await requireUserId(locale, "/onboarding");
  const profile = await getMyProfile(userId);
  if (profile?.handle) redirect({ href: "/dashboard", locale });
  const name = profile?.display_name ?? "";
  return (
    <main className="mx-auto w-full max-w-lg px-4 py-10">
      <OnboardingFlow
        suggestedHandle={suggestHandle(name)}
        name={name.split(" ")[0]}
      />
    </main>
  );
}
