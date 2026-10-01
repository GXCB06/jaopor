"use client";

import { MessageCircleIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { totalUnread, unreadByConversation } from "@/lib/chat";
import { createClient } from "@/lib/supabase/client";

const POLL_MS = 60_000;

/** Design.md §5 Chat entry point: header icon with the unread message count (polled while visible). */
export function MessagesLink({ userId }: { userId: string }) {
  const t = useTranslations("Chat");
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const tick = async () => {
      if (document.visibilityState !== "visible") return;
      setUnread(
        totalUnread(await unreadByConversation(createClient(), userId)),
      );
    };
    void tick();
    const id = setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [userId]);

  return (
    <Link
      href="/dashboard/messages"
      aria-label={unread ? t("labelUnread", { n: unread }) : t("title")}
      className="relative inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
    >
      <MessageCircleIcon className="size-4" aria-hidden="true" />
      {unread > 0 && (
        <span className="absolute -top-0.5 -right-0.5 inline-flex min-w-4 items-center justify-center rounded-full bg-brand px-1 text-3xs font-bold text-white tabular-nums">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}
