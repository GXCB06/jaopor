import { EyeOffIcon } from "lucide-react";
import { useTranslations } from "next-intl";

/** Owner views: marks a project in anonymous mode (Design.md §5 Anonymous projects). */
export function AnonymousChip() {
  const t = useTranslations("Anonymous");
  return (
    <span className="inline-flex w-fit items-center gap-1 rounded-full border px-1.5 py-0.5 text-2xs font-normal text-muted-foreground">
      <EyeOffIcon className="size-3" aria-hidden="true" />
      {t("badge")}
    </span>
  );
}
