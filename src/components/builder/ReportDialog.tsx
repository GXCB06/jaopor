"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { reportUser } from "@/app/actions/profile";
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

/** "รายงานผู้ใช้นี้": reason + optional note → user_reports (one per reporter per user). */
export function ReportDialog({ profileId }: { profileId: string }) {
  const t = useTranslations("Builder");
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>("spam");
  const [note, setNote] = useState("");
  const [busy, start] = useTransition();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="text-2xs text-faint hover:text-foreground hover:underline">
        {t("report")}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("report")}</DialogTitle>
          <DialogDescription>{t("reportHint")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Select
            id="report-reason"
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
                const res = await reportUser(profileId, reason, note);
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
