import { PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BrandLogo } from "./BrandLogo";
import { CurrencyToggle } from "./CurrencyToggle";
import { HeaderAuth } from "./HeaderAuth";
import { LocaleSwitch } from "./LocaleSwitch";
import { MobileNav } from "./MobileNav";
import { SearchShortcut } from "./SearchShortcut";
import { ThemeToggle } from "./ThemeToggle";

const navLink =
  "text-xs font-medium whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground";

/** Design.md §5 SiteHeader: sticky bar, nav links, "/" search, primary Add. */
export function SiteHeader() {
  const t = useTranslations("Nav");
  return (
    <header className="sticky top-0 z-40 border-b bg-background">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4 md:gap-6">
        <Link href="/" className="shrink-0 text-sm">
          <BrandLogo />
        </Link>
        <nav className="hidden items-center gap-4 lg:flex xl:gap-5">
          <Link href="/startups" className={navLink}>
            {t("startups")}
          </Link>
          <Link href="/builders" className={navLink}>
            {t("builders")}
          </Link>
          <Link href="/feed" className={navLink}>
            {t("feed")}
          </Link>
          <Link href="/categories" className={navLink}>
            {t("categories")}
          </Link>
          <Link href="/olympics" className={navLink}>
            {t("olympics")}
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-0.5 sm:gap-3 lg:gap-2 xl:gap-3">
          {/* Phones: in the menu instead (UX audit C-11: seven controls in 343 px). */}
          <span className="hidden sm:contents">
            <CurrencyToggle />
          </span>
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
          {/* Below sm the language and theme switches live in MobileNav's menu. */}
          <div className="hidden items-center gap-3 sm:flex">
            <LocaleSwitch />
            <ThemeToggle />
          </div>
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
