"use client";

import {
  ArrowLeftIcon,
  Loader2Icon,
  MoreHorizontalIcon,
  SendIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  blockConversation,
  deleteMessage,
  editMessage,
  markRead,
  sendMessage,
  unblockConversation,
} from "@/app/actions/chat";
import { ReportDialog } from "@/components/builder/ReportDialog";
import { useConfirm } from "@/components/core/useConfirm";
import { Avatar } from "@/components/posts/bits";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link, useRouter } from "@/i18n/navigation";
import { MAX_MESSAGE, MESSAGE_WARN_AT, groupMessages } from "@/lib/chat";
import type { ChatMessage, ChatPerson } from "@/lib/data/chat";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const POLL_MS = 10_000;

type Row = {
  id: number;
  sender_id: string;
  body: string;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
};

const toMessage = (r: Row): ChatMessage => ({
  id: r.id,
  senderId: r.sender_id,
  body: r.body,
  createdAt: r.created_at,
  editedAt: r.edited_at,
  deletedAt: r.deleted_at,
});

/**
 * Design.md §5 Chat conversation: messages grouped by day and sender, live via Supabase Realtime
 * (RLS applies), with polling as a fallback while the live channel isn't connected.
 */
export function ChatThread({
  conversationId,
  viewer,
  other,
  blocked: initialBlocked,
  blockedByMe: initialBlockedByMe = false,
  initial,
}: {
  conversationId: number;
  viewer: string;
  other: ChatPerson | null;
  blocked: boolean;
  blockedByMe?: boolean;
  initial: ChatMessage[];
}) {
  const t = useTranslations("Chat");
  const locale = useLocale();
  const router = useRouter();
  const [messages, setMessages] = useState(initial);
  const [blocked, setBlocked] = useState(initialBlocked);
  const [blockedByMe, setBlockedByMe] = useState(initialBlockedByMe);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState(false);
  const [reporting, setReporting] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editBody, setEditBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirm, confirmDialog] = useConfirm();
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastAt = useRef(initial.at(-1)?.createdAt ?? null);

  const add = useCallback((incoming: ChatMessage[]) => {
    if (!incoming.length) return;
    setMessages((cur) => {
      const seen = new Set(cur.map((m) => m.id));
      const fresh = incoming.filter((m) => !seen.has(m.id));
      if (!fresh.length) return cur;
      const next = [...cur, ...fresh].sort((a, b) =>
        a.createdAt.localeCompare(b.createdAt),
      );
      lastAt.current = next.at(-1)!.createdAt;
      return next;
    });
  }, []);

  // Patch already-shown messages (an edit / soft delete, mine or the other person's).
  const merge = useCallback((rows: ChatMessage[]) => {
    if (!rows.length) return;
    setMessages((cur) => {
      const byId = new Map(rows.map((r) => [r.id, r]));
      let changed = false;
      const next = cur.map((m) => {
        const r = byId.get(m.id);
        if (
          r &&
          (r.body !== m.body ||
            r.editedAt !== m.editedAt ||
            r.deletedAt !== m.deletedAt)
        ) {
          changed = true;
          return { ...m, body: r.body, editedAt: r.editedAt, deletedAt: r.deletedAt };
        }
        return m;
      });
      return changed ? next : cur;
    });
  }, []);

  // Live channel; mark read whenever the other person's message arrives while I'm here.
  useEffect(() => {
    const db = createClient();
    const channel = db
      .channel(`chat:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const r = payload.new as Row;
          add([toMessage(r)]);
          if (r.sender_id !== viewer) void markRead(conversationId);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => merge([toMessage(payload.new as Row)]),
      )
      .subscribe((status) => setLive(status === "SUBSCRIBED"));
    void markRead(conversationId);
    return () => {
      void db.removeChannel(channel);
    };
  }, [conversationId, viewer, add, merge]);

  // Fallback: poll for newer messages while the live channel is down.
  useEffect(() => {
    if (live) return;
    const id = setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      let q = createClient()
        .from("chat_messages")
        .select("id, sender_id, body, created_at, edited_at, deleted_at")
        .eq("conversation_id", conversationId)
        .order("created_at")
        .limit(100);
      if (lastAt.current) q = q.gt("created_at", lastAt.current);
      const { data } = await q;
      if (data?.length) {
        add(data.map((r) => toMessage(r as Row)));
        void markRead(conversationId);
      }
    }, POLL_MS);
    return () => clearInterval(id);
  }, [live, conversationId, add]);

  // Scroll the message list only (scrollIntoView would also scroll the page).
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  async function send() {
    const text = body.trim();
    if (!text || busy) return;
    setBusy(true);
    const res = await sendMessage(conversationId, text);
    setBusy(false);
    if (!res.ok) {
      toast.error(t(`errors.${res.error}` as "errors.failed"));
      return;
    }
    setBody("");
    add([res.message]);
  }

  function startEdit(m: ChatMessage) {
    setEditingId(m.id);
    setEditBody(m.body);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditBody("");
  }

  async function saveEdit(m: ChatMessage) {
    const text = editBody.trim();
    if (!text || saving) return;
    setSaving(true);
    const res = await editMessage(conversationId, m.id, text);
    setSaving(false);
    if (!res.ok) {
      toast.error(t(`errors.${res.error}` as "errors.failed"));
      return;
    }
    merge([{ ...m, body: text, editedAt: res.editedAt }]);
    cancelEdit();
  }

  async function remove(m: ChatMessage) {
    const ok = await confirm({
      title: t("deleteTitle"),
      body: t("deleteBody"),
      confirmLabel: t("delete"),
      destructive: true,
    });
    if (!ok) return;
    const res = await deleteMessage(conversationId, m.id);
    if (!res.ok) {
      toast.error(t(`errors.${res.error}` as "errors.failed"));
      return;
    }
    merge([{ ...m, body: "", deletedAt: new Date().toISOString() }]);
    toast.success(t("deleted"));
  }

  async function block() {
    const ok = await confirm({
      title: t("blockTitle", { name: other?.name ?? "" }),
      body: t("blockBody"),
      confirmLabel: t("block"),
      destructive: true,
    });
    if (!ok) return;
    const res = await blockConversation(conversationId);
    if (!res.ok) {
      toast.error(t(`errors.${res.error}` as "errors.failed"));
      return;
    }
    setBlocked(true);
    setBlockedByMe(true);
    toast.success(t("blocked"));
    router.refresh();
  }

  async function unblock() {
    const ok = await confirm({
      title: t("unblockTitle", { name: other?.name ?? "" }),
      body: t("unblockBody"),
      confirmLabel: t("unblock"),
    });
    if (!ok) return;
    const res = await unblockConversation(conversationId);
    if (!res.ok) {
      toast.error(t(`errors.${res.error}` as "errors.failed"));
      return;
    }
    setBlocked(false);
    setBlockedByMe(false);
    toast.success(t("unblocked"));
    router.refresh();
  }

  const dayFmt = new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const timeFmt = new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const days = groupMessages(messages);
  const canWrite = !blocked && other !== null;

  return (
    <section
      aria-label={t("conversationWith", {
        name: other?.name ?? t("deletedUser"),
      })}
      className="flex h-full min-h-0 flex-col"
    >
      <header className="flex items-center gap-3 border-b px-4 py-3">
        <Link
          href="/dashboard/messages"
          aria-label={t("back")}
          className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground lg:hidden"
        >
          <ArrowLeftIcon className="size-4" aria-hidden="true" />
        </Link>
        <Avatar
          name={other?.name ?? "?"}
          src={other?.avatarUrl ?? null}
          size={32}
        />
        <div className="min-w-0 flex-1">
          {other?.handle ? (
            <Link
              href={`/u/${other.handle}`}
              className="block truncate text-sm font-semibold hover:underline"
            >
              {other.name}
            </Link>
          ) : (
            <p className="truncate text-sm font-semibold">
              {other?.name ?? t("deletedUser")}
            </p>
          )}
          {blocked && (
            <p className="text-2xs text-faint">{t("blockedShort")}</p>
          )}
        </div>
        {other && !blocked && (
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label={t("menu")}
              className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <MoreHorizontalIcon className="size-4" aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {other.handle && (
                <DropdownMenuItem asChild>
                  <Link href={`/u/${other.handle}`}>{t("viewProfile")}</Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => void block()}
              >
                {t("block")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </header>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4"
        aria-live="polite"
      >
        {messages.length === 0 && (
          <p className="py-10 text-center text-caption text-faint">
            {t("emptyThread")}
          </p>
        )}
        {days.map((d) => (
          <div key={d.day} className="space-y-3">
            <p className="text-center text-2xs text-faint">
              {dayFmt.format(new Date(d.runs[0].items[0].createdAt))}
            </p>
            {d.runs.map((run) => {
              const mine = run.senderId === viewer;
              return (
                <div
                  key={run.items[0].id}
                  className={cn(
                    "flex flex-col gap-1",
                    mine ? "items-end" : "items-start",
                  )}
                >
                  {run.items.map((m) => {
                    const deleted = m.deletedAt !== null;
                    if (editingId === m.id) {
                      return (
                        <div key={m.id} className="flex w-full">
                          <div className="w-full min-w-0 space-y-1.5 rounded-2xl border border-input bg-background p-2">
                            <label
                              className="sr-only"
                              htmlFor={`chat-edit-${m.id}`}
                            >
                              {t("edit")}
                            </label>
                            <textarea
                              id={`chat-edit-${m.id}`}
                              value={editBody}
                              rows={1}
                              maxLength={MAX_MESSAGE}
                              autoFocus
                              onChange={(e) => setEditBody(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Escape") {
                                  e.preventDefault();
                                  cancelEdit();
                                } else if (
                                  e.key === "Enter" &&
                                  !e.shiftKey &&
                                  !e.nativeEvent.isComposing
                                ) {
                                  e.preventDefault();
                                  void saveEdit(m);
                                }
                              }}
                              className="[field-sizing:content] max-h-32 min-h-9 w-full resize-none bg-transparent px-1 text-sm focus-visible:outline-none"
                            />
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={cancelEdit}
                                className="rounded-md px-2 py-1 text-2xs text-muted-foreground hover:bg-accent hover:text-foreground"
                              >
                                {t("cancel")}
                              </button>
                              <button
                                type="button"
                                onClick={() => void saveEdit(m)}
                                disabled={saving || !editBody.trim()}
                                className="rounded-md bg-primary px-2.5 py-1 text-2xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
                              >
                                {t("save")}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div
                        key={m.id}
                        className={cn(
                          "group flex max-w-[80%] items-center gap-1",
                          mine && "flex-row-reverse",
                        )}
                      >
                        <p
                          className={cn(
                            "rounded-2xl px-3.5 py-2 font-prose text-sm leading-relaxed break-words whitespace-pre-line",
                            mine
                              ? deleted
                                ? "rounded-br-md bg-secondary text-faint italic"
                                : "rounded-br-md bg-brand text-white"
                              : cn(
                                  "rounded-bl-md border border-border bg-secondary",
                                  deleted ? "text-faint italic" : "text-foreground",
                                ),
                          )}
                        >
                          {deleted ? t("deletedMessage") : m.body}
                        </p>
                        {mine && !deleted && (
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              aria-label={t("messageMenu")}
                              className="inline-flex size-6 shrink-0 items-center justify-center rounded text-faint opacity-60 hover:bg-accent hover:text-foreground focus-visible:opacity-100 md:opacity-0 md:group-hover:opacity-100"
                            >
                              <MoreHorizontalIcon
                                className="size-3.5"
                                aria-hidden="true"
                              />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={() => startEdit(m)}>
                                {t("edit")}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                variant="destructive"
                                onSelect={() => void remove(m)}
                              >
                                {t("delete")}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                        {!mine && !deleted && (
                          <button
                            type="button"
                            aria-label={t("reportMessage")}
                            onClick={() => setReporting(m.id)}
                            className="inline-flex size-6 shrink-0 items-center justify-center rounded text-faint opacity-60 hover:bg-accent hover:text-foreground focus-visible:opacity-100 md:opacity-0 md:group-hover:opacity-100"
                          >
                            <MoreHorizontalIcon
                              className="size-3.5"
                              aria-hidden="true"
                            />
                          </button>
                        )}
                      </div>
                    );
                  })}
                  <time
                    dateTime={run.items.at(-1)!.createdAt}
                    className="text-3xs text-faint"
                  >
                    {timeFmt.format(new Date(run.items.at(-1)!.createdAt))}
                    {run.items.some((x) => x.editedAt) && (
                      <span> · {t("edited")}</span>
                    )}
                  </time>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {canWrite ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
          className="flex items-end gap-2 border-t p-3"
        >
          <label className="sr-only" htmlFor={`chat-box-${conversationId}`}>
            {t("messageLabel")}
          </label>
          <div className="min-w-0 flex-1">
            <textarea
              id={`chat-box-${conversationId}`}
              value={body}
              rows={1}
              maxLength={MAX_MESSAGE}
              placeholder={t("placeholder")}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  !e.shiftKey &&
                  !e.nativeEvent.isComposing
                ) {
                  e.preventDefault();
                  void send();
                }
              }}
              className="[field-sizing:content] max-h-32 min-h-10 w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            />
            {body.length > MESSAGE_WARN_AT && (
              <p className="mt-1 text-right text-2xs text-warning tabular-nums">
                {body.length} / {MAX_MESSAGE}
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={busy || !body.trim()}
            aria-label={t("send")}
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {busy ? (
              <Loader2Icon className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <SendIcon className="size-4" aria-hidden="true" />
            )}
            <span className="hidden sm:inline">{t("send")}</span>
          </button>
        </form>
      ) : other && blockedByMe ? (
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-t px-4 py-3 text-caption text-faint">
          <span>{t("blockedByMeNote")}</span>
          <button
            type="button"
            onClick={() => void unblock()}
            className="font-semibold text-brand-text hover:underline"
          >
            {t("unblock")}
          </button>
        </div>
      ) : (
        <p className="border-t px-4 py-3 text-center text-caption text-faint">
          {other ? t("blockedNote") : t("deletedNote")}
        </p>
      )}
      {confirmDialog}
      {reporting !== null && (
        <ReportDialog
          targetType="message"
          targetId={String(reporting)}
          open
          onOpenChange={(o) => !o && setReporting(null)}
        />
      )}
    </section>
  );
}
