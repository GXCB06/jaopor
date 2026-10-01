"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { reportTarget } from "@/app/actions/posts";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, inputClass } from "@/components/wizard/fields";
import { cn } from "@/lib/utils";

const REASONS = [
  "spam",
  "fake",
  "harassment",
  "impersonation",
  "other",
] as const;

/**
 * Report a user, post or comment: reason + optional note → reports (one per reporter per target).
 * With `open` / `onOpenChange` it is controlled (opened from a menu) and renders no trigger.
 */
export function ReportDialog({
  targetType,
  targetId,
  open: controlledOpen,
  onOpenChange,
}: {
  targetType: "user" | "post" | "comment";
  targetId: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const t = useTranslations("Builder");
  const [ownOpen, setOwnOpen] = useState(false);
  const open = controlledOpen ?? ownOpen;
  const setOpen = onOpenChange ?? setOwnOpen;
  const [reason, setReason] = useState<string>("spam");
  const [note, setNote] = useState("");
  const [busy, start] = useTransition();
  const title = t(`reportTitle.${targetType}`);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {controlledOpen === undefined && (
        <DialogTrigger className="text-2xs text-faint hover:text-foreground hover:underline">
          {title}
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{t("reportHint")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Select
            id={`report-reason-${targetType}-${targetId}`}
            value={reason}
            onChange={setReason}
            options={REASONS.map((r) => ({
              value: r,
              label: t(`reasons.${r}`),
            }))}
          />
          <textarea
            value={note}
            maxLength={500}
            rows={3}
            placeholder={t("reportNote")}
            aria-label={t("reportNote")}
            onChange={(e) => setNote(e.target.value)}
            className={cn(inputClass, "h-auto py-2")}
          />
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="destructive"
            disabled={busy}
            onClick={() =>
              start(async () => {
                const res = await reportTarget({
                  type: targetType,
                  id: targetId,
                  reason,
                  note,
                });
                if (res.ok) {
                  toast.success(t("reported"));
                  setOpen(false);
                } else toast.error(t("errors.failed"));
              })
            }
          >
            {t("sendReport")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
