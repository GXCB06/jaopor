import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  CheckIcon,
  PencilIcon,
  PlugIcon,
  PlusIcon,
} from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card } from "@/components/core/Card";
import { CopyWorkLink } from "@/components/dashboard/CopyWorkLink";
import { RequestActions } from "@/components/dashboard/RequestActions";
import { Composer } from "@/components/posts/Composer";
import { Money, StartupLogo } from "@/components/StartupBits";
import { Link } from "@/i18n/navigation";
import { PersonPhoto } from "@/components/PersonPhoto";
import { requireUserId } from "@/lib/auth";
import { getThbPerUsd } from "@/lib/data/fx";
import { myPostableStartups } from "@/lib/data/posts";
import {
  getDashboard,
  getMyProfile,
  getMyRequests,
  getMySkills,
} from "@/lib/data/me";
import { SETUP_STEPS, setupChecklist, type SetupStep } from "@/lib/profile";
import { SOURCE_NAME, isSource } from "@/lib/sources/catalog";
import { logoUrl } from "@/lib/supabase/public";
import { cn } from "@/lib/utils";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/dashboard">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Me" });
  return { title: t("nav.overview"), robots: { index: false } };
}

/** Any verified source: revenue, visitors or build proof. */
const isVerified = (s: {
  verification_status: string;
  visitors_30d: number | null;
  build_commits: number | null;
}) =>
  s.verification_status === "verified" ||
  s.visitors_30d !== null ||
  s.build_commits !== null;

// Design.md §6 Dashboard overview (docs/design/dashboard.png, Phase 9d): greeting + weekly views,
// setup checklist (hidden when done), "ผลงานของฉัน" table with the unverified banner and the two
// add/claim tiles, then "คำขอคุย" preview and "โปรไฟล์ 7 วันที่ผ่านมา".
export default async function DashboardPage({
  params,
}: PageProps<"/[locale]/dashboard">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const userId = await requireUserId(locale, "/dashboard");

  const [t, dt, profile, dash, skills, requests, thbPerUsd, postable] =
    await Promise.all([
      getTranslations("Me"),
      getTranslations("Dashboard"),
      getMyProfile(userId),
      getDashboard(userId),
      getMySkills(userId),
      getMyRequests(userId),
      getThbPerUsd(),
      myPostableStartups(),
    ]);
  const first = dash.startups[0];
  const owned = dash.startups.filter((s) => s.owner_id === userId);
  const done = setupChecklist({
    startups: dash.startups.length,
    province: profile?.province ?? null,
    verifiedStartups: dash.startups.filter(isVerified).length,
    skills: skills.length,
    screenshots: dash.screenshots,
  });
  const doneCount = SETUP_STEPS.filter((s) => done[s]).length;
  const next = SETUP_STEPS.find((s) => !done[s]);
  const stepHref: Record<SetupStep, string> = {
    account: "/dashboard/profile",
    firstStartup: "/new",
    province: "/dashboard/profile#province",
    verify: first ? `/dashboard/${first.id}/edit#verify-revenue` : "/new",
    skillsStatus: "/dashboard/profile#skills",
    screenshots: first ? `/dashboard/${first.id}/edit#screenshots` : "/new",
  };
  const pending = requests.filter((r) => r.incoming && r.status === "pending");
  const firstName = (profile?.display_name ?? profile?.handle ?? "").split(
    " ",
  )[0];
  const iconBtn =
    "inline-flex size-8 items-center justify-center rounded-md border text-muted-foreground hover:bg-accent hover:text-foreground";

  return (
    <main className="space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("hello", { name: firstName })}
          </h1>
          <p className="mt-1 text-caption text-muted-foreground">
            {/* S-14: "0 visits" when nothing counts visitors read as broken. */}
            {dash.startups.some((s) => s.traffic_provider)
              ? t("weekViews", { n: dash.weekVisitors })
              : t("weekNoCounting")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/u/${profile?.handle}`}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-xs font-semibold hover:bg-accent"
          >
            {t("viewPublic")}
            <ArrowUpRightIcon className="size-3.5" aria-hidden="true" />
          </Link>
          <Link
            href="/new"
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground hover:opacity-90"
          >
            <PlusIcon className="size-3.5" aria-hidden="true" />
            {t("addWork")}
          </Link>
        </div>
      </header>

      {/* Setup checklist */}
      {doneCount < SETUP_STEPS.length && (
        <Card className="p-5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <h2 className="text-sm font-bold">{t("setupTitle")}</h2>
            <span className="text-caption text-faint tabular-nums">
              {doneCount} / {SETUP_STEPS.length}
            </span>
            <div
              className="h-1.5 min-w-24 flex-1 overflow-hidden rounded-full bg-secondary"
              role="progressbar"
              aria-valuenow={doneCount}
              aria-valuemin={0}
              aria-valuemax={SETUP_STEPS.length}
              aria-label={t("setupTitle")}
            >
              <div
                className="h-full rounded-full bg-brand"
                style={{ width: `${(doneCount / SETUP_STEPS.length) * 100}%` }}
              />
            </div>
            <span className="text-2xs text-faint">{t("setupHint")}</span>
          </div>
          <ol className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {SETUP_STEPS.map((step) => {
              const isDone = done[step];
              const isNext = step === next;
              const inner = (
                <>
                  <span
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-full border",
                      isDone &&
                        "border-positive/40 bg-positive/10 text-positive",
                      isNext && "border-brand",
                    )}
                  >
                    {isDone && (
                      <CheckIcon className="size-3" aria-hidden="true" />
                    )}
                  </span>
                  <span
                    className={cn(
                      "min-w-0 flex-1 truncate",
                      isDone && "text-faint",
                    )}
                  >
                    {t(`setup.${step}`)}
                  </span>
                  {!isDone && (
                    <ArrowRightIcon
                      className="size-3.5 shrink-0"
                      aria-hidden="true"
                    />
                  )}
                </>
              );
              const cls = cn(
                "flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-caption",
                isNext
                  ? "border-brand bg-brand/10 font-semibold"
                  : isDone
                    ? "bg-background/40"
                    : "hover:bg-accent",
              );
              return (
                <li key={step}>
                  {isDone ? (
                    <span className={cls}>
                      {inner}
                      <span className="sr-only">{t("done")}</span>
                    </span>
                  ) : (
                    <Link href={stepHref[step]} className={cls}>
                      {inner}
                    </Link>
                  )}
                </li>
              );
            })}
          </ol>
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        {/* My works */}
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b px-5 py-3.5">
            <h2 className="text-sm font-bold">{t("myWorks")}</h2>
            <span className="text-2xs text-faint">{t("last7")}</span>
          </div>
          {dash.startups.length > 0 && (
            <table className="w-full table-fixed text-left">
              <thead>
                <tr className="border-b text-2xs font-bold tracking-wider text-faint uppercase">
                  <th className="py-2.5 pl-5 font-bold">{t("work")}</th>
                  <th className="hidden w-20 px-2 py-2.5 text-right font-bold sm:table-cell">
                    {t("visitors7d")}
                  </th>
                  <th className="hidden w-16 px-2 py-2.5 text-right font-bold sm:table-cell">
                    {t("rank")}
                  </th>
                  <th className="w-24 px-2 py-2.5 text-right font-bold">MRR</th>
                  <th className="w-[7.5rem] py-2.5 pr-5">
                    <span className="sr-only">{t("actions")}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {dash.startups.map((s) => {
                  const verified = isVerified(s);
                  const sources = [
                    s.verified_provider,
                    s.traffic_provider,
                    s.github_repo ? "github" : null,
                  ]
                    .filter((x): x is string => Boolean(x))
                    .filter((x, i, all) => all.indexOf(x) === i)
                    .map((x) => (isSource(x) ? SOURCE_NAME[x] : x));
                  return (
                    <tr
                      key={s.id}
                      className="border-b align-top last:border-b-0"
                    >
                      <td className="py-3.5 pl-5" colSpan={1}>
                        <div className="flex min-w-0 items-center gap-2.5">
                          <StartupLogo
                            name={s.name}
                            src={logoUrl(s.logo_path)}
                            size={36}
                          />
                          <span className="min-w-0">
                            <Link
                              // A private project has no public page: open the editor instead (S-10).
                              href={
                                s.status === "published"
                                  ? `/startup/${s.slug}`
                                  : `/dashboard/${s.id}/edit`
                              }
                              className="block truncate text-xs font-semibold hover:underline"
                            >
                              {s.name}
                            </Link>
                            {s.status === "private" && (
                              <span className="block text-2xs text-muted-foreground">
                                {dt("private")}
                              </span>
                            )}
                            {verified ? (
                              <span className="block truncate text-2xs text-positive">
                                ✓ {t("verified")}
                                {sources.length > 0 &&
                                  ` · ${sources.join(" · ")}`}
                              </span>
                            ) : (
                              <span className="block text-2xs text-warning">
                                {t("unverified")}
                              </span>
                            )}
                          </span>
                        </div>
                        {!verified && s.owner_id === userId && (
                          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-2xs">
                            <PlugIcon
                              className="size-3.5 text-warning"
                              aria-hidden="true"
                            />
                            <span className="min-w-0 flex-1">
                              {t("verifyBanner")}
                            </span>
                            <Link
                              href={`/dashboard/${s.id}/edit#verify-revenue`}
                              className="rounded-md bg-primary px-2.5 py-1 font-semibold text-primary-foreground"
                            >
                              {t("connectStripe")}
                            </Link>
                            <Link
                              href={`/dashboard/${s.id}/edit#verify`}
                              className="rounded-md border px-2.5 py-1 font-semibold hover:bg-accent"
                            >
                              {t("otherOptions")}
                            </Link>
                          </div>
                        )}
                      </td>
                      <td className="hidden px-2 py-3.5 text-right text-xs font-bold tabular-nums sm:table-cell">
                        {s.visitors7d ?? "–"}
                      </td>
                      <td className="hidden px-2 py-3.5 text-right text-xs tabular-nums sm:table-cell">
                        {s.rank ? `#${s.rank}` : "–"}
                      </td>
                      <td className="px-2 py-3.5 text-right text-xs font-bold tabular-nums">
                        {s.verification_status === "verified" ? (
                          <Money cents={s.mrr_cents} thbPerUsd={thbPerUsd} />
                        ) : (
                          "–"
                        )}
                      </td>
                      <td className="py-3 pr-5">
                        <div className="flex justify-end gap-1">
                          {s.owner_id === userId && (
                            <Link
                              href={`/dashboard/${s.id}/edit`}
                              aria-label={t("editWork", { name: s.name })}
                              title={t("edit")}
                              className={iconBtn}
                            >
                              <PencilIcon
                                className="size-3.5"
                                aria-hidden="true"
                              />
                            </Link>
                          )}
                          {s.status === "published" && (
                            <>
                              <CopyWorkLink slug={s.slug} name={s.name} />
                              <Link
                                href={`/startup/${s.slug}`}
                                aria-label={t("viewWork", { name: s.name })}
                                title={t("view")}
                                className={iconBtn}
                              >
                                <ArrowUpRightIcon
                                  className="size-3.5"
                                  aria-hidden="true"
                                />
                              </Link>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          <div className="grid gap-3 p-5">
            <Link
              href="/new"
              className="flex gap-3 rounded-xl border border-dashed p-4 transition-colors hover:border-brand/60"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-background">
                <PlusIcon className="size-4" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-xs font-semibold">
                  {t("newWork")}
                </span>
                <span className="mt-0.5 block text-2xs text-muted-foreground">
                  {t("newWorkHint")}
                </span>
              </span>
            </Link>
            {/* The "claim a project" tile (coming soon) is hidden until the claim flow exists:
                a disabled tile in the main column was a dead end (UX audit C-6). */}
          </div>
          {owned.length === 0 && dash.startups.length === 0 && (
            <p className="px-5 pb-5 text-caption text-muted-foreground">
              {t("noWorks")}
            </p>
          )}
        </Card>

        <div className="space-y-6">
          {/* Requests preview */}
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b px-5 py-3.5">
              <h2 className="text-sm font-bold">{t("requestsTitle")}</h2>
              <Link
                href="/dashboard/requests"
                className="text-2xs text-faint hover:text-foreground"
              >
                {t("all")} ›
              </Link>
            </div>
            {pending.length === 0 ? (
              <p className="px-5 py-6 text-caption text-muted-foreground">
                {t("noPendingRequests")}
              </p>
            ) : (
              <ul>
                {pending.slice(0, 2).map((r) => (
                  <li key={r.id} className="space-y-3 border-b px-5 py-4">
                    <div className="flex gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-secondary text-2xs font-bold uppercase">
                        <PersonPhoto
                          src={r.other?.avatar_url}
                          fallback={(r.other?.display_name ?? "?").slice(0, 2)}
                        />
                      </span>
                      <span className="min-w-0 text-caption">
                        <span className="block truncate">
                          <b className="font-semibold">
                            {r.other?.display_name ?? r.other?.handle}
                          </b>
                          <span className="text-faint">
                            {" "}
                            · {t(`topics.${r.topic}`)}
                          </span>
                        </span>
                        <span className="line-clamp-2 text-muted-foreground">
                          {r.message}
                        </span>
                      </span>
                    </div>
                    <RequestActions id={r.id} />
                  </li>
                ))}
              </ul>
            )}
            <p className="px-5 py-3 text-2xs text-faint">
              {pending.length > 2 &&
                `${t("morePending", { n: pending.length - 2 })} · `}
              {t("contactsNote")}
            </p>
          </Card>

          {/* Profile, last 7 days */}
          <Card className="p-5">
            <h2 className="text-sm font-bold">{t("profile7d")}</h2>
            <dl className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <dd className="text-xl font-bold tabular-nums">
                  {dash.views7d}
                </dd>
                <dt className="text-2xs text-faint">{t("profileViews")}</dt>
              </div>
              <div>
                <dd className="text-xl font-bold tabular-nums">
                  {dash.requests7d}
                </dd>
                <dt className="text-2xs text-faint">{t("requestsReceived")}</dt>
              </div>
            </dl>
          </Card>
        </div>
      </div>

      {/* Phase 10b: post a project update (also on /feed). Below the founder's own work since
          the UX audit (S-11): it used to push "ผลงานของฉัน" below the first screen. */}
      <Composer
        me={{
          name: profile?.display_name ?? profile?.handle ?? "",
          avatarUrl: profile?.avatar_url ?? null,
        }}
        startups={postable}
        loginHref="/login"
      />
    </main>
  );
}
