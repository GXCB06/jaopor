"use client";

import { Share2Icon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/**
 * Design.md §5 builder profile header: share a founder's profile. Phones get the native Web Share
 * sheet; elsewhere (or when it fails) we copy the canonical short link `/{locale}/@handle` instead.
 * UX master audit B1.2 (item 11).
 */
export function ProfileShareButton({
  handle,
  name,
}: {
  handle: string;
  name: string;
}) {
  const t = useTranslations("Builder");
  const locale = useLocale();
  return (
    <Button
      type="button"
      size="lg"
      variant="outline"
      className="w-full"
      onClick={async () => {
        const url = new URL(
          `/${locale}/@${handle}`,
          window.location.origin,
        ).toString();
        if (navigator.share) {
          try {
            await navigator.share({ title: t("shareText", { name }), url });
            return;
          } catch (err) {
            // Dismissing the sheet is not a failure; anything else falls back to copying.
            if (err instanceof DOMException && err.name === "AbortError") return;
          }
        }
        try {
          await navigator.clipboard.writeText(url);
          toast.success(t("linkCopied"));
        } catch {
          // Clipboard blocked (permissions / insecure context): nothing else to do.
        }
      }}
    >
      <Share2Icon aria-hidden="true" />
      {t("shareProfile")}
    </Button>
  );
}
