import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BrandLogo } from "./BrandLogo";
import { HeaderAuth } from "./HeaderAuth";
import { LocaleSwitch } from "./LocaleSwitch";
import { ThemeToggle } from "./ThemeToggle";

export function SiteHeader() {
  const t = useTranslations("Nav");
  return (
    <header className="border-b">
      <div className="mx-auto flex h-12 w-full max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="text-sm">
          <BrandLogo />
        </Link>
        <nav className="flex items-center gap-3 sm:gap-4">
          <Link
            href="/startups"
            className="text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            {t("startups")}
          </Link>
          <Link
            href="/new"
            className="hidden text-xs font-medium text-muted-foreground hover:text-foreground sm:inline"
          >
            {t("addStartup")}
          </Link>
          <HeaderAuth />
          <LocaleSwitch />
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
