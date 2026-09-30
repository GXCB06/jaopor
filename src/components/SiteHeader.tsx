import { PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BrandLogo } from "./BrandLogo";
import { CurrencyToggle } from "./CurrencyToggle";
import { HeaderAuth } from "./HeaderAuth";
import { LocaleSwitch } from "./LocaleSwitch";
import { SearchShortcut } from "./SearchShortcut";
import { ThemeToggle } from "./ThemeToggle";

const navLink =
  "text-xs font-medium text-muted-foreground transition-colors hover:text-foreground";

/** Design.md §5 SiteHeader: sticky bar, nav links, "/" search, primary Add. */
export function SiteHeader() {
  const t = useTranslations("Nav");
  return (
    <header className="sticky top-0 z-40 border-b bg-background">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-6 px-4">
        <Link href="/" className="shrink-0 text-sm">
          <BrandLogo />
        </Link>
        <nav className="hidden items-center gap-5 md:flex">
          <Link href="/startups" className={navLink}>
            {t("startups")}
          </Link>
          <Link
            href={{ pathname: "/", hash: "leaderboard" }}
            className={navLink}
          >
            {t("leaderboard")}
          </Link>
          <Link href="/dashboard" className={navLink}>
            {t("dashboard")}
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <CurrencyToggle />
          <SearchShortcut />
          <Link
            href="/new"
            aria-label={t("addStartup")}
            className="inline-flex h-8 items-center gap-1 rounded-md bg-primary px-2 text-xs font-semibold whitespace-nowrap text-primary-foreground transition-opacity hover:opacity-90 sm:px-3"
          >
            <PlusIcon className="size-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">{t("addStartup")}</span>
          </Link>
          <HeaderAuth />
          <LocaleSwitch />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
