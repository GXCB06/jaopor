"use client";

import { BellIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "@/i18n/navigation";
import { timeAgo } from "@/lib/posts";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Avatar } from "./posts/bits";

type Row = {
  id: number;
  kind: string;
  read_at: string | null;
  created_at: string;
  post_id: number | null;
  actor: {
    display_name: string | null;
    handle: string | null;
    avatar_url: string | null;
  } | null;
};

const POLL_MS = 60_000;

/**
 * Design.md §5 NotificationBell: unread count (polled while the tab is visible), the latest 15 in
 * a dropdown; opening it marks them read. Reads with the user's own client (owner-only RLS).
 */
export function NotificationBell() {
  const t = useTranslations("Notify");
  const locale = useLocale();
  const [unread, setUnread] = useState(0);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [now, setNow] = useState(0);

  const count = useCallback(async () => {
    const { count: n } = await createClient()
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .is("read_at", null);
    setUnread(n ?? 0);
  }, []);

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") void count();
    };
    tick();
    const id = setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [count]);

  async function open() {
    const db = createClient();
    const { data } = await db
      .from("notifications")
      .select(
        "id, kind, read_at, created_at, post_id, actor:profiles!notifications_actor_id_fkey(display_name, handle, avatar_url)",
      )
      .order("created_at", { ascending: false })
      .limit(15);
    setNow(Date.now());
    setRows((data ?? []) as Row[]);
    if (unread > 0) {
      await db
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .is("read_at", null);
      setUnread(0);
    }
  }

  const href = (r: Row) =>
    r.kind === "post_like" && r.post_id
      ? `/post/${r.post_id}`
      : r.kind === "post_comment" && r.post_id
        ? `/post/${r.post_id}#comments`
        : "/dashboard/requests";

  return (
    <DropdownMenu onOpenChange={(o) => o && void open()}>
      <DropdownMenuTrigger
        aria-label={unread ? t("labelUnread", { n: unread }) : t("label")}
        className="relative inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <BellIcon className="size-4" aria-hidden="true" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 inline-flex min-w-4 items-center justify-center rounded-full bg-brand px-1 text-3xs font-bold text-white tabular-nums">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="max-h-[420px] w-80 overflow-y-auto"
      >
        <DropdownMenuLabel className="text-caption">
          {t("title")}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {rows === null ? (
          <p className="px-2 py-3 text-caption text-faint">…</p>
        ) : rows.length === 0 ? (
          <p className="px-2 py-3 text-caption text-faint">{t("empty")}</p>
        ) : (
          rows.map((r) => {
            const name =
              r.actor?.display_name ?? r.actor?.handle ?? t("someone");
            return (
              <DropdownMenuItem key={r.id} asChild>
                <Link
                  href={href(r)}
                  className={cn(
                    "flex items-start gap-2.5",
                    !r.read_at && "bg-brand/5",
                  )}
                >
                  <Avatar
                    name={name}
                    src={r.actor?.avatar_url ?? null}
                    size={28}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-caption leading-snug">
                      {t.rich(`kind.${r.kind}` as "kind.post_like", {
                        name: () => <b>{name}</b>,
                      })}
                    </span>
                    <span className="block text-2xs text-faint">
                      {timeAgo(r.created_at, locale, now)}
                    </span>
                  </span>
                </Link>
              </DropdownMenuItem>
            );
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
