import { MailIcon, MessageCircleIcon } from "lucide-react";
import type { Metadata } from "next";
import {
  getFormatter,
  getTranslations,
  setRequestLocale,
} from "next-intl/server";
import { Card } from "@/components/core/Card";
import { MarkNotificationsRead } from "@/components/dashboard/MarkNotificationsRead";
import { RequestActions } from "@/components/dashboard/RequestActions";
import { WithdrawRequest } from "@/components/dashboard/WithdrawRequest";
import { Link } from "@/i18n/navigation";
import { requireUserId } from "@/lib/auth";
import {
  getMyRequests,
  unreadNotifications,
  type RequestRow,
} from "@/lib/data/me";
import { cn } from "@/lib/utils";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/dashboard/requests">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Me" });
  return { title: t("nav.requests"), robots: { index: false } };
}

// Design.md §6 Requests inbox (Phase 9d): received (pending first) and sent. Accepting reveals both
// sides' LINE / email (RLS), creates in-app notifications for both, and nothing is emailed yet.
export default async function RequestsPage({
  params,
}: PageProps<"/[locale]/dashboard/requests">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const userId = await requireUserId(locale, "/dashboard/requests");
  const [t, format, rows, unread] = await Promise.all([
    getTranslations("Me"),
    getFormatter(),
    getMyRequests(userId),
    unreadNotifications(),
  ]);
  const incoming = rows
    .filter((r) => r.incoming)
    .sort(
      (a, b) => Number(b.status === "pending") - Number(a.status === "pending"),
    );
  const outgoing = rows.filter((r) => !r.incoming);

  const item = (r: RequestRow) => (
    <li key={r.id} className="space-y-3 border-b px-5 py-4 last:border-b-0">
      <div className="flex gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-secondary text-2xs font-bold uppercase">
          {r.other?.avatar_url?.startsWith("https://") ? (
            // eslint-disable-next-line @next/next/no-img-element -- OAuth avatar
            <img
              src={r.other.avatar_url}
              alt=""
              className="size-full object-cover"
            />
          ) : (
            (r.other?.display_name ?? "?").slice(0, 2)
          )}
        </span>
        <div className="min-w-0 flex-1 text-caption">
          <p className="flex flex-wrap items-center gap-x-2">
            {r.other?.handle ? (
              <Link
                href={`/u/${r.other.handle}`}
                className="font-semibold hover:underline"
              >
                {r.other.display_name ?? r.other.handle}
              </Link>
            ) : (
              <b className="font-semibold">{t("deletedUser")}</b>
            )}
            <span className="text-faint">· {t(`topics.${r.topic}`)}</span>
            <span
              className={cn(
                "rounded-full border px-1.5 text-3xs",
                r.status === "accepted" && "border-positive/40 text-positive",
                r.status === "pending" && "border-warning/40 text-warning",
              )}
            >
              {t(`reqStatus.${r.status}`)}
            </span>
            <span className="ml-auto text-2xs text-faint">
              {format.relativeTime(new Date(r.created_at))}
            </span>
          </p>
          {r.other?.headline && (
            <p className="text-faint">{r.other.headline}</p>
          )}
          <p className="mt-1.5 whitespace-pre-line text-muted-foreground">
            {r.message}
          </p>
        </div>
      </div>
      {r.contacts && (r.contacts.line_id || r.contacts.email) && (
        <div className="flex flex-wrap gap-3 rounded-lg border border-positive/30 bg-positive/10 px-3 py-2 text-caption">
          {r.contacts.line_id && (
            <span className="inline-flex items-center gap-1.5">
              <MessageCircleIcon className="size-3.5" aria-hidden="true" />
              LINE: <b className="font-semibold">{r.contacts.line_id}</b>
            </span>
          )}
          {r.contacts.email && (
            <a
              href={`mailto:${r.contacts.email}`}
              className="inline-flex items-center gap-1.5 hover:underline"
            >
              <MailIcon className="size-3.5" aria-hidden="true" />
              {r.contacts.email}
            </a>
          )}
        </div>
      )}
      {r.status === "accepted" && !r.contacts && (
        <p className="text-2xs text-faint">{t("noContactsShared")}</p>
      )}
      {r.incoming && r.status === "pending" && (
        <RequestActions id={r.id} withBlock />
      )}
      {!r.incoming && r.status === "pending" && <WithdrawRequest id={r.id} />}
    </li>
  );

  return (
    <main className="max-w-3xl space-y-6">
      <MarkNotificationsRead unread={unread} />
      <header>
        <h1 className="text-2xl font-bold tracking-tight">
          {t("nav.requests")}
        </h1>
        <p className="mt-1 text-caption text-muted-foreground">
          {t("contactsNote")}
        </p>
      </header>
      <Card className="overflow-hidden">
        <h2 className="border-b px-5 py-3.5 text-sm font-bold">
          {t("received")}
        </h2>
        {incoming.length ? (
          <ul>{incoming.map(item)}</ul>
        ) : (
          <p className="px-5 py-6 text-caption text-muted-foreground">
            {t("noRequests")}
          </p>
        )}
      </Card>
      <Card className="overflow-hidden">
        <h2 className="border-b px-5 py-3.5 text-sm font-bold">{t("sent")}</h2>
        {outgoing.length ? (
          <ul>{outgoing.map(item)}</ul>
        ) : (
          <p className="px-5 py-6 text-caption text-muted-foreground">
            {t("noSent")}
          </p>
        )}
      </Card>
    </main>
  );
}
