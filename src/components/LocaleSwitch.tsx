"use client";

import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";

export function LocaleSwitch() {
  const t = useTranslations("Nav");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();

  return (
    <button
      type="button"
      className="text-xs font-medium text-muted-foreground hover:text-foreground"
      onClick={() =>
        router.replace(
          // @ts-expect-error — pathname and params always match for the current route
          { pathname, params },
          { locale: locale === "th" ? "en" : "th" },
        )
      }
    >
      {t("language")}
    </button>
  );
}
