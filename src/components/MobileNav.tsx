"use client";

import {
  GlobeIcon,
  LayoutGridIcon,
  MenuIcon,
  MoonIcon,
  RocketIcon,
  SunIcon,
  TrophyIcon,
  UserIcon,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { applyTheme, useThemeMode } from "@/lib/theme";

/**
 * Design.md §5 SiteHeader MobileNav: below `lg` the nav links live in this menu; below `sm` it
 * also holds the language and theme switches (the header row must fit 360px).
 */
export function MobileNav() {
  const t = useTranslations("Nav");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const mode = useThemeMode();
  const nextMode = mode === "dark" ? "light" : "dark";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("menu")}
        className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground lg:hidden"
      >
        <MenuIcon className="size-4" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        <DropdownMenuItem asChild>
          <Link href="/startups">
            <RocketIcon aria-hidden="true" />
            {t("startups")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/categories">
            <LayoutGridIcon aria-hidden="true" />
            {t("categories")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={{ pathname: "/", hash: "leaderboard" }}>
            <TrophyIcon aria-hidden="true" />
            {t("leaderboard")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/dashboard">
            <UserIcon aria-hidden="true" />
            {t("dashboard")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="sm:hidden" />
        <DropdownMenuItem
          className="sm:hidden"
          onSelect={() =>
            router.replace(
              // @ts-expect-error — pathname and params always match for the current route
              { pathname, params },
              { locale: locale === "th" ? "en" : "th" },
            )
          }
        >
          <GlobeIcon aria-hidden="true" />
          <span lang={locale === "th" ? "en" : "th"}>{t("language")}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="sm:hidden"
          onSelect={() => applyTheme(nextMode)}
        >
          {nextMode === "light" ? (
            <SunIcon aria-hidden="true" />
          ) : (
            <MoonIcon aria-hidden="true" />
          )}
          {nextMode === "light" ? t("themeLight") : t("themeDark")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
