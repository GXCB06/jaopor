import { useTranslations } from "next-intl";
import { isAnonymousSlug } from "@/lib/anonymous";

/** A project's name, or "ผลงานไม่เปิดเผยชื่อ" for an anonymous one (Design.md §5 Anonymous projects). */
export function ProjectName({ name, slug }: { name: string; slug: string }) {
  const t = useTranslations("Anonymous");
  return <>{isAnonymousSlug(slug) ? t("name") : name}</>;
}
