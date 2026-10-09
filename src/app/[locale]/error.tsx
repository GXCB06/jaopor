"use client";

import { useTranslations } from "next-intl";
import { ErrorScreen } from "@/components/ErrorScreen";
import { Button, buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

// Design.md §5 Not-found and error pages: a render error under the layout. In production Next
// passes only an opaque digest for server errors; the message and stack are never shown.
export default function LocaleError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const t = useTranslations("ErrorPage");
  return (
    <ErrorScreen
      code={t("errorCode")}
      title={t("errorTitle")}
      body={t("errorBody")}
      reference={error.digest ? t("reference", { digest: error.digest }) : null}
      actions={
        <>
          <Button type="button" onClick={() => retry()}>
            {t("retry")}
          </Button>
          <Link href="/" className={buttonVariants({ variant: "outline" })}>
            {t("home")}
          </Link>
        </>
      }
    />
  );
}
