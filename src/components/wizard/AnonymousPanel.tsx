"use client";

import { EyeOffIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { setProjectAnonymous } from "@/app/actions/anonymous";
import { useConfirm } from "@/components/core/useConfirm";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

// Design.md §5 Anonymous projects: the owner's switch on the edit page (basics). Saves on its own
// (the database masks / restores the identity) after a confirm that says what changes.
export function AnonymousPanel({
  startupId,
  anonymous,
}: {
  startupId: number;
  anonymous: boolean;
}) {
  const t = useTranslations("Anonymous");
  const common = useTranslations("Common");
  const [confirm, dialog] = useConfirm();
  const router = useRouter();
  const [on, setOn] = useState(anonymous);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    const next = !on;
    const ok = await confirm({
      title: next ? t("confirmOn") : t("confirmOff"),
      body: next ? t("confirmOnBody") : t("confirmOffBody"),
      confirmLabel: next ? t("turnOn") : t("turnOff"),
    });
    if (!ok) return;
    setBusy(true);
    const res = await setProjectAnonymous(startupId, next);
    setBusy(false);
    if (!res.ok) {
      toast.error(
        res.error === "not_ready" ? t("notReady") : common("genericError"),
      );
      return;
    }
    setOn(next);
    toast.success(next ? t("on") : t("off"));
    router.refresh();
  }

  return (
    <div
      id="anonymous"
      className={cn(
        "scroll-mt-24 space-y-3 rounded-lg border p-4 sm:col-span-2",
        on && "border-brand/40 bg-brand/5",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-2.5">
          <EyeOffIcon
            className="mt-0.5 size-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <div className="min-w-0 space-y-1">
            <p id="anonymous-label" className="text-xs font-semibold">
              {t("switchLabel")}
            </p>
            <p className="text-caption text-muted-foreground">
              {on ? t("ownerNote") : t("intro")}
            </p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-labelledby="anonymous-label"
          disabled={busy}
          onClick={() => void toggle()}
          className={cn(
            "relative mt-0.5 h-5 w-9 shrink-0 rounded-full border transition-colors disabled:opacity-50",
            on ? "border-brand bg-brand" : "bg-secondary",
          )}
        >
          <span
            className={cn(
              "absolute top-1/2 size-3.5 -translate-y-1/2 rounded-full bg-foreground transition-all",
              on ? "left-4.5 bg-white" : "left-0.5",
            )}
          />
        </button>
      </div>
      <ul className="space-y-1.5 pl-6.5 text-caption text-muted-foreground">
        <li>{t("hides")}</li>
        <li>{t("shows")}</li>
        <li className="text-warning">{t("keepGeneric")}</li>
        {!on && <li>{t("newLink")}</li>}
      </ul>
      {dialog}
    </div>
  );
}
