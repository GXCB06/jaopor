"use client";

import { Loader2Icon, MoreHorizontalIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { addComment, deleteComment } from "@/app/actions/posts";
import { ReportDialog } from "@/components/builder/ReportDialog";
import { useConfirm } from "@/components/core/useConfirm";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { inputClass } from "@/components/wizard/fields";
import { Link, useRouter } from "@/i18n/navigation";
import type { CommentView } from "@/lib/data/posts";
import { MAX_COMMENT_BODY, timeAgo } from "@/lib/posts";
import { cn } from "@/lib/utils";
import { Avatar } from "./bits";

function CommentBox({
  id,
  postId,
  parentId,
  autoFocus,
  onDone,
}: {
  id?: string;
  postId: number;
  parentId?: number;
  autoFocus?: boolean;
  onDone: () => void;
}) {
  const t = useTranslations("Posts");
  const [body, setBody] = useState("");
  const [busy, start] = useTransition();
  return (
    <div id={id} className="scroll-mt-24 space-y-2">
      <textarea
        value={body}
        maxLength={MAX_COMMENT_BODY}
        rows={parentId ? 2 : 3}
        autoFocus={autoFocus}
        aria-label={parentId ? t("replyLabel") : t("commentLabel")}
        placeholder={parentId ? t("replyPh") : t("commentPh")}
        onChange={(e) => setBody(e.target.value)}
        className={cn(inputClass, "h-auto py-2 text-sm")}
      />
      <div className="flex items-center justify-end gap-3">
        <span className="text-2xs text-faint tabular-nums">
          {body.length} / {MAX_COMMENT_BODY}
        </span>
        <Button
          size="sm"
          disabled={busy || !body.trim()}
          onClick={() =>
            start(async () => {
              const res = await addComment({ postId, body, parentId });
              if (!res.ok) {
                toast.error(t(`errors.${res.error}` as "errors.failed"));
                return;
              }
              setBody("");
              onDone();
            })
          }
        >
          {busy && <Loader2Icon className="animate-spin" aria-hidden="true" />}
          {parentId ? t("reply") : t("sendComment")}
        </Button>
      </div>
    </div>
  );
}

/** Design.md §5 comments: top-level comments, one level of replies, tombstones kept. */
export function CommentThread({
  postId,
  comments,
  viewerId,
  loginHref,
  canComment,
  now,
}: {
  postId: number;
  comments: CommentView[];
  viewerId: string | null;
  loginHref: string;
  /** False on hidden posts. */
  canComment: boolean;
  now: number;
}) {
  const t = useTranslations("Posts");
  const locale = useLocale();
  const router = useRouter();
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [reporting, setReporting] = useState<number | null>(null);
  const [confirm, confirmDialog] = useConfirm();
  const top = comments.filter((c) => c.parentId === null);
  const repliesOf = (id: number) => comments.filter((c) => c.parentId === id);

  const item = (c: CommentView) => (
    <div key={c.id} className="flex gap-3">
      {c.author ? (
        c.author.handle ? (
          <Link href={`/u/${c.author.handle}`} aria-label={c.author.name}>
            <Avatar name={c.author.name} src={c.author.avatarUrl} size={28} />
          </Link>
        ) : (
          <Avatar name={c.author.name} src={c.author.avatarUrl} size={28} />
        )
      ) : (
        <span className="size-7 shrink-0 rounded-full border border-dashed" />
      )}
      <div className="min-w-0 flex-1 space-y-1">
        {c.deleted || !c.author ? (
          <p className="text-caption text-faint italic">
            {t("commentDeleted")}
          </p>
        ) : (
          <>
            <p className="flex flex-wrap items-baseline gap-x-2 text-caption">
              {c.author.handle ? (
                <Link
                  href={`/u/${c.author.handle}`}
                  className="font-semibold hover:underline"
                >
                  {c.author.name}
                </Link>
              ) : (
                <b>{c.author.name}</b>
              )}
              <time dateTime={c.createdAt} className="text-faint">
                {timeAgo(c.createdAt, locale, now)}
              </time>
            </p>
            <p className="font-prose text-sm leading-relaxed break-words whitespace-pre-line">
              {c.body}
            </p>
          </>
        )}
        {!c.deleted && c.author && viewerId && (
          <div className="flex items-center gap-1 text-2xs text-muted-foreground">
            {c.parentId === null && canComment && (
              <button
                type="button"
                onClick={() => setReplyTo(replyTo === c.id ? null : c.id)}
                className="rounded px-1.5 py-0.5 hover:bg-accent hover:text-foreground"
              >
                {t("reply")}
              </button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label={t("commentMenu")}
                className="inline-flex size-6 items-center justify-center rounded hover:bg-accent hover:text-foreground"
              >
                <MoreHorizontalIcon className="size-3.5" aria-hidden="true" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {c.authorId === viewerId ? (
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={async () => {
                      const ok = await confirm({
                        title: t("deleteCommentTitle"),
                        confirmLabel: t("delete"),
                        destructive: true,
                      });
                      if (!ok) return;
                      const res = await deleteComment(c.id);
                      if (!res.ok)
                        toast.error(
                          t(`errors.${res.error}` as "errors.failed"),
                        );
                      router.refresh();
                    }}
                  >
                    {t("delete")}
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onSelect={() => setReporting(c.id)}>
                    {t("report")}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
        {replyTo === c.id && (
          <CommentBox
            postId={postId}
            parentId={c.id}
            autoFocus
            onDone={() => {
              setReplyTo(null);
              router.refresh();
            }}
          />
        )}
      </div>
    </div>
  );

  return (
    <section id="comments" className="scroll-mt-24 space-y-5">
      <h2 className="text-sm font-bold">
        {t("commentsTitle", { n: comments.filter((c) => !c.deleted).length })}
      </h2>
      {!canComment ? null : viewerId ? (
        <CommentBox
          id="comment-box"
          postId={postId}
          onDone={() => router.refresh()}
        />
      ) : (
        <p className="text-caption text-muted-foreground">
          <Link
            href={loginHref}
            className="font-semibold text-brand-text hover:underline"
          >
            {t("signIn")}
          </Link>{" "}
          {t("toComment")}
        </p>
      )}
      {top.length === 0 ? (
        <p className="text-caption text-faint">{t("noComments")}</p>
      ) : (
        <ul className="space-y-5">
          {top.map((c) => (
            <li key={c.id} className="space-y-4">
              {item(c)}
              {repliesOf(c.id).length > 0 && (
                <ul className="ml-3.5 space-y-4 border-l pl-6">
                  {repliesOf(c.id).map((r) => (
                    <li key={r.id}>{item(r)}</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
      {confirmDialog}
      {reporting !== null && (
        <ReportDialog
          targetType="comment"
          targetId={String(reporting)}
          open
          onOpenChange={(o) => !o && setReporting(null)}
        />
      )}
    </section>
  );
}
