import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { StartupWizard } from "@/components/wizard/StartupWizard";
import { requireUserId } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { robots: { index: false } };

export default async function EditStartupPage({
  params,
  searchParams,
}: PageProps<"/[locale]/dashboard/[id]/edit">) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const userId = await requireUserId(locale, `/dashboard/${id}/edit`);
  const sp = await searchParams;

  const supabase = await createClient();
  const { data: startup } = await supabase
    .from("startups")
    .select("*")
    .eq("id", Number(id))
    .eq("owner_id", userId)
    .maybeSingle();
  if (!startup) notFound();

  const t = await getTranslations("Dashboard");
  const step = sp.step === "revenue" ? 2 : 1;

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold tracking-tight md:text-3xl">
        {t("edit")} · {startup.name}
      </h1>
      <StartupWizard userId={userId} initial={startup} initialStep={step} />
    </main>
  );
}
