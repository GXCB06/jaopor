"use client";

import { LinkIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

/** Small icon button that copies an absolute URL for `path` (Design.md §9 "Card Copy link"). */
export function CopyLinkButton({ path }: { path: string }) {
  const t = useTranslations("Card");
  return (
    <button
      type="button"
      aria-label={t("copyLink")}
      title={t("copyLink")}
      className="relative z-10 rounded-md p-1 text-faint group-hover:opacity-100 hover:bg-accent hover:text-foreground focus-visible:opacity-100 md:opacity-0"
      onClick={async (e) => {
        e.preventDefault();
        await navigator.clipboard.writeText(
          new URL(path, window.location.origin).toString(),
        );
        toast.success(t("linkCopied"));
      }}
    >
      <LinkIcon className="size-3.5" />
    </button>
  );
}
