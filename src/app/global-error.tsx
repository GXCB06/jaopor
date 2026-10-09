"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ErrorScreen } from "@/components/ErrorScreen";
import { buttonVariants } from "@/components/ui/button";
import "./globals.css";

// Design.md §5 Not-found and error pages: the root layout itself failed, so there is no layout,
// no intl provider and no global styles. It renders its own document, picks the language from the
// first path segment and loads only that language's messages (a separate chunk, fetched only when
// this page appears, so the strings stay in messages/*.json without growing every page's bundle).
type Copy = Record<
  "errorCode" | "errorTitle" | "errorBody" | "retry" | "home" | "reference",
  string
>;

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const locale = usePathname()?.split("/")[1] === "en" ? "en" : "th";
  const [copy, setCopy] = useState<Copy | null>(null);

  useEffect(() => {
    import(`../../messages/${locale}.json`)
      .then((m) => setCopy(m.default.ErrorPage as Copy))
      .catch(() => setCopy(null));
  }, [locale]);

  return (
    <html lang={locale} className="dark h-full antialiased">
      <body className="flex min-h-full flex-col bg-background text-foreground">
        {copy && (
          <ErrorScreen
            code={copy.errorCode}
            title={copy.errorTitle}
            body={copy.errorBody}
            reference={
              error.digest
                ? copy.reference.replace("{digest}", error.digest)
                : null
            }
            actions={
              <>
                <button
                  type="button"
                  onClick={() => retry()}
                  className={buttonVariants()}
                >
                  {copy.retry}
                </button>
                {/* A full page load: the app shell itself is what failed. */}
                <a
                  href={`/${locale}`}
                  className={buttonVariants({ variant: "outline" })}
                >
                  {copy.home}
                </a>
              </>
            }
          />
        )}
      </body>
    </html>
  );
}
