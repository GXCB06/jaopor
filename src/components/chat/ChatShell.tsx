import { useLocale, useTranslations } from "next-intl";
import { Avatar } from "@/components/posts/bits";
import { Link } from "@/i18n/navigation";
import type { ConversationSummary } from "@/lib/data/chat";
import { timeAgo } from "@/lib/posts";
import { cn } from "@/lib/utils";

/**
 * Design.md §5 Chat: the conversation list and the open conversation in one card. On phones only
 * one of the two shows (the list on /dashboard/messages, the conversation on /…/[id]).
 */
export function ChatShell({
  conversations,
  activeId,
  now,
  children,
}: {
  conversations: ConversationSummary[];
  activeId: number | null;
  now: number;
  children: React.ReactNode;
}) {
  const t = useTranslations("Chat");
  const locale = useLocale();
  return (
    <div className="grid h-[calc(100dvh-9rem)] min-h-[28rem] grid-cols-1 overflow-hidden rounded-xl border bg-card lg:grid-cols-[18rem_minmax(0,1fr)]">
      <nav
        aria-label={t("listLabel")}
        className={cn(
          "min-h-0 overflow-y-auto lg:border-r",
          activeId !== null && "max-lg:hidden",
        )}
      >
        {conversations.length === 0 ? (
          <div className="space-y-2 p-6 text-center text-caption text-muted-foreground">
            <p>{t("emptyList")}</p>
            <Link
              href="/builders"
              className="font-semibold text-brand-text hover:underline"
            >
              {t("findBuilders")} →
            </Link>
          </div>
        ) : (
          <ul>
            {conversations.map((c) => {
              const name = c.other?.name ?? t("deletedUser");
              return (
                <li key={c.id}>
                  <Link
                    href={`/dashboard/messages/${c.id}`}
                    aria-current={c.id === activeId ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 border-b px-4 py-3 transition-colors",
                      c.id === activeId ? "bg-secondary" : "hover:bg-accent",
                    )}
                  >
                    <Avatar name={name} src={c.other?.avatarUrl ?? null} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span
                          className={cn(
                            "truncate text-caption",
                            c.unread ? "font-bold" : "font-semibold",
                          )}
                        >
                          {name}
                        </span>
                        {c.last && (
                          <span className="shrink-0 text-2xs text-faint">
                            {timeAgo(c.last.at, locale, now)}
                          </span>
                        )}
                      </span>
                      <span className="flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            "truncate text-2xs",
                            c.unread
                              ? "text-foreground"
                              : "text-muted-foreground",
                          )}
                        >
                          {c.blocked
                            ? t("blockedShort")
                            : c.last
                              ? `${c.last.mine ? `${t("you")}: ` : ""}${c.last.body}`
                              : c.other
                                ? t("sayHi")
                                : null}
                        </span>
                        {c.unread > 0 && (
                          <span className="inline-flex min-w-4 shrink-0 items-center justify-center rounded-full bg-brand px-1 text-3xs font-bold text-white tabular-nums">
                            {c.unread > 9 ? "9+" : c.unread}
                          </span>
                        )}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </nav>
      <div className={cn("min-h-0", activeId === null && "max-lg:hidden")}>
        {children}
      </div>
    </div>
  );
}
