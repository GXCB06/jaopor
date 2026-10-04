import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card } from "@/components/core/Card";
import { Link } from "@/i18n/navigation";
import { PersonPhoto } from "@/components/PersonPhoto";
import { requireUserId } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/dashboard/connections">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Me" });
  return { title: t("nav.connections"), robots: { index: false } };
}

type Person = {
  handle: string | null;
  display_name: string | null;
  avatar_url: string | null;
  headline: string | null;
};

const PERSON = "handle, display_name, avatar_url, headline";

// Design.md §6 Connections (Phase 9d): who follows me / whom I follow (follows are public).
export default async function ConnectionsPage({
  params,
}: PageProps<"/[locale]/dashboard/connections">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const userId = await requireUserId(locale, "/dashboard/connections");
  const supabase = await createClient();
  const [t, followers, following] = await Promise.all([
    getTranslations("Me"),
    supabase
      .from("follows")
      .select(`created_at, person:profiles!follows_follower_id_fkey(${PERSON})`)
      .eq("following_id", userId)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("follows")
      .select(
        `created_at, person:profiles!follows_following_id_fkey(${PERSON})`,
      )
      .eq("follower_id", userId)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  const list = (rows: { person: Person | null }[] | null, empty: string) =>
    rows?.length ? (
      <ul>
        {rows.map(({ person: p }, i) =>
          p?.handle ? (
            <li key={p.handle + i} className="border-b last:border-b-0">
              <Link
                href={`/u/${p.handle}`}
                className="flex items-center gap-3 px-5 py-3 hover:bg-accent/40"
              >
                <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-secondary text-2xs font-bold uppercase">
                  <PersonPhoto
                    src={p.avatar_url}
                    fallback={(p.display_name ?? p.handle).slice(0, 2)}
                  />
                </span>
                <span className="min-w-0 text-caption">
                  <span className="block truncate font-semibold">
                    {p.display_name ?? p.handle}
                  </span>
                  <span className="block truncate text-faint">
                    @{p.handle}
                    {p.headline && ` · ${p.headline}`}
                  </span>
                </span>
              </Link>
            </li>
          ) : null,
        )}
      </ul>
    ) : (
      <p className="px-5 py-6 text-caption text-muted-foreground">{empty}</p>
    );

  return (
    <main className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">
        {t("nav.connections")}
      </h1>
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="overflow-hidden">
          <h2 className="border-b px-5 py-3.5 text-sm font-bold">
            {t("followers", { n: followers.data?.length ?? 0 })}
          </h2>
          {list(followers.data, t("noFollowers"))}
        </Card>
        <Card className="overflow-hidden">
          <h2 className="border-b px-5 py-3.5 text-sm font-bold">
            {t("following", { n: following.data?.length ?? 0 })}
          </h2>
          {list(following.data, t("noFollowing"))}
        </Card>
      </div>
    </main>
  );
}
