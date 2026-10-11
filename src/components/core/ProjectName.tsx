import { useTranslations } from "next-intl";
import { anonymousMask, isAnonymousSlug } from "@/lib/anonymous";
import { cn } from "@/lib/utils";

/**
 * A project's name. An anonymous one shows a blurred made-up word; screen readers and copy hear
 * "ผลงานไม่เปิดเผยชื่อ" (Design.md §5 Anonymous projects).
 */
export function ProjectName({
  name,
  slug,
  className,
}: {
  name: string;
  slug: string;
  className?: string;
}) {
  const t = useTranslations("Anonymous");
  if (!isAnonymousSlug(slug)) return <>{name}</>;
  return (
    <>
      <span
        aria-hidden="true"
        className={cn("inline-block blur-[5px] select-none", className)}
      >
        {anonymousMask(slug)}
      </span>
      <span className="sr-only">{t("name")}</span>
    </>
  );
}
