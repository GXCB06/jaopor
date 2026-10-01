"use client";

import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { setLiveOptOut, useLive } from "./LivePresence";

/** Privacy page §5: this browser's live-map opt-out (same switch as under the home map). */
export function LiveOptOutControl() {
  const t = useTranslations("Privacy");
  const { optedOut } = useLive();
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card px-4 py-3 text-caption">
      {optedOut ? (
        <EyeOffIcon className="size-4 text-faint" aria-hidden="true" />
      ) : (
        <EyeIcon className="size-4 text-positive" aria-hidden="true" />
      )}
      <span className="flex-1">{t(optedOut ? "liveHidden" : "liveShown")}</span>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => setLiveOptOut(!optedOut)}
      >
        {t(optedOut ? "optIn" : "optOut")}
      </Button>
    </div>
  );
}
