"use client";

import { Share2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/**
 * Olympics share: the phone share sheet when there is one (LINE, Facebook…), else copy the link.
 * The page's OG image (podium) makes the shared post.
 */
export function ShareBoardButton({ text }: { text: string }) {
  const t = useTranslations("Olympics");
  return (
    <Button
      type="button"
      variant="outline"
      onClick={async () => {
        const url = window.location.href;
        try {
          if (navigator.share) {
            await navigator.share({ title: document.title, text, url });
            return;
          }
        } catch (err) {
          if ((err as Error).name === "AbortError") return;
        }
        await navigator.clipboard.writeText(url);
        toast.success(t("linkCopied"));
      }}
    >
      <Share2Icon aria-hidden="true" />
      {t("share")}
    </Button>
  );
}
