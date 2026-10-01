"use client";

import { MoreHorizontalIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deletePost, editPost } from "@/app/actions/posts";
import { ReportDialog } from "@/components/builder/ReportDialog";
import { useConfirm } from "@/components/core/useConfirm";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { inputClass } from "@/components/wizard/fields";
import { useRouter } from "@/i18n/navigation";
import { MAX_POST_BODY, canEdit } from "@/lib/posts";
import { cn } from "@/lib/utils";

/** `⋯` on a post: edit (15 minutes) and delete for the author, report for everyone else. */
export function PostMenu({
  post,
  isAuthor,
  signedIn,
  afterDeleteHref,
}: {
  post: {
    id: number;
    body: string;
    linkUrl: string | null;
    createdAt: string;
    isAuto: boolean;
  };
  isAuthor: boolean;
  signedIn: boolean;
  /** Where to go after deleting (the post page); lists just refresh. */
  afterDeleteHref?: string;
}) {
  const t = useTranslations("Posts");
  const router = useRouter();
  const [confirm, confirmDialog] = useConfirm();
  const [editing, setEditing] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [body, setBody] = useState(post.body);
  const [link, setLink] = useState(post.linkUrl ?? "");
  const [busy, start] = useTransition();
  if (!signedIn) return null;
  // Rendering a menu item depends on the clock; evaluated on open only.
  const editable = () => isAuthor && !post.isAuto && canEdit(post.createdAt);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={t("menu")}
          className="inline-flex size-8 items-center justify-center rounded-md hover:bg-accent hover:text-foreground"
        >
          <MoreHorizontalIcon className="size-4" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {isAuthor ? (
            <>
              {editable() && (
                <DropdownMenuItem onSelect={() => setEditing(true)}>
                  {t("edit")}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                variant="destructive"
                onSelect={async () => {
                  const ok = await confirm({
                    title: t("deleteTitle"),
                    body: t("deleteBody"),
                    confirmLabel: t("delete"),
                    destructive: true,
                  });
                  if (!ok) return;
                  const res = await deletePost(post.id);
                  if (!res.ok) {
                    toast.error(t(`errors.${res.error}` as "errors.failed"));
                    return;
                  }
                  toast.success(t("deleted"));
                  if (afterDeleteHref) router.replace(afterDeleteHref);
                  else router.refresh();
                }}
              >
                {t("delete")}
              </DropdownMenuItem>
            </>
          ) : (
            <DropdownMenuItem onSelect={() => setReporting(true)}>
              {t("report")}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {confirmDialog}
      {!isAuthor && (
        <ReportDialog
          targetType="post"
          targetId={String(post.id)}
          open={reporting}
          onOpenChange={setReporting}
        />
      )}
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("editTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <textarea
              value={body}
              maxLength={MAX_POST_BODY}
              rows={5}
              aria-label={t("bodyLabel")}
              onChange={(e) => setBody(e.target.value)}
              className={cn(inputClass, "h-auto py-2")}
            />
            <input
              value={link}
              inputMode="url"
              placeholder={t("linkPh")}
              aria-label={t("linkLabel")}
              onChange={(e) => setLink(e.target.value)}
              className={inputClass}
            />
            <p className="text-right text-2xs text-faint tabular-nums">
              {body.length} / {MAX_POST_BODY}
            </p>
          </div>
          <DialogFooter>
            <Button
              disabled={busy || !body.trim()}
              onClick={() =>
                start(async () => {
                  const res = await editPost(post.id, { body, link });
                  if (!res.ok) {
                    toast.error(t(`errors.${res.error}` as "errors.failed"));
                    return;
                  }
                  setEditing(false);
                  router.refresh();
                })
              }
            >
              {t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
