import { useTranslations } from "next-intl";
import { ErrorScreen } from "@/components/ErrorScreen";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

// Design.md §5 Not-found and error pages: inside the layout (header, footer, current language), for
// notFound() calls and every unmatched URL ([...rest]/page.tsx).
export default function NotFound() {
  const t = useTranslations("ErrorPage");
  return (
    <ErrorScreen
      code={t("notFoundCode")}
      title={t("notFoundTitle")}
      body={t("notFoundBody")}
      actions={
        <>
          <Link href="/" className={buttonVariants()}>
            {t("home")}
          </Link>
          <Link
            href="/startups"
            className={buttonVariants({ variant: "outline" })}
          >
            {t("browse")}
          </Link>
        </>
      }
    />
  );
}
