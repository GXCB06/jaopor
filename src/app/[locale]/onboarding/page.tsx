import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { OnboardingFlow } from "@/components/profile-edit/OnboardingFlow";
import { redirect as nextRedirect } from "next/navigation";
import { requireUserId } from "@/lib/auth";
import { getMyProfile } from "@/lib/data/me";
import { afterOnboardingPath, safeNextPath } from "@/lib/next-path";
import { suggestHandle } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/onboarding">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Me" });
  return { title: t("onb.metaTitle"), robots: { index: false } };
}

// Spec 9e onboarding: only for signed-in users without a username. When done (or if they already
// have one) they continue to `next`, the page they signed in from (Design.md §6 Sign-in routing).
export default async function OnboardingPage({
  params,
  searchParams,
}: PageProps<"/[locale]/onboarding">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const next = safeNextPath(typeof sp.next === "string" ? sp.next : null);
  const userId = await requireUserId(
    locale,
    next ? `/onboarding?next=${encodeURIComponent(next)}` : "/onboarding",
  );
  const supabase = await createClient();
  const [profile, owned] = await Promise.all([
    getMyProfile(userId),
    supabase
      .from("startups")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", userId),
  ]);
  const done = next ?? afterOnboardingPath(locale, (owned.count ?? 0) > 0);
  if (profile?.handle) nextRedirect(done);
  const name = profile?.display_name ?? "";
  return (
    <main className="mx-auto w-full max-w-lg px-4 py-10">
      <OnboardingFlow
        suggestedHandle={suggestHandle(name)}
        name={name.split(" ")[0]}
        done={done}
        // Came to add a project: one screen, then straight to Add-project (UX audit M-8).
        quick={/^\/(th|en)\/new(?:[?#]|$)/.test(done)}
      />
    </main>
  );
}
