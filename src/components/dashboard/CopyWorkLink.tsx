"use client";

import { Share2Icon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";

/** Dashboard row "แชร์": copies the project's public link. */
export function CopyWorkLink({ slug, name }: { slug: string; name: string }) {
  const t = useTranslations("Me");
  const locale = useLocale();
  return (
    <button
      type="button"
      aria-label={t("shareWork", { name })}
      title={t("share")}
      onClick={async () => {
        await navigator.clipboard.writeText(
          new URL(
            `/${locale}/startup/${slug}`,
            window.location.origin,
          ).toString(),
        );
        toast.success(t("linkCopied"));
      }}
      className="inline-flex size-8 items-center justify-center rounded-md border text-muted-foreground hover:bg-accent hover:text-foreground"
    >
      <Share2Icon className="size-3.5" aria-hidden="true" />
    </button>
  );
}
