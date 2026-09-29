import { PlusIcon, SearchIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/** Design.md §5 SearchBar — plain GET form to the directory (works without JS). */
export function SearchBar({
  locale,
  defaultValue,
  autoFocus,
}: {
  locale: string;
  defaultValue?: string;
  autoFocus?: boolean;
}) {
  const t = useTranslations("Home");
  const nav = useTranslations("Nav");
  return (
    <div className="flex w-full items-center gap-2">
      <form
        action={`/${locale}/startups`}
        method="get"
        role="search"
        className="relative flex-1"
      >
        <SearchIcon
          className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-faint"
          aria-hidden="true"
        />
        <input
          name="q"
          defaultValue={defaultValue}
          placeholder={t("searchPlaceholder")}
          aria-label={nav("search")}
          maxLength={60}
          autoFocus={autoFocus}
          className="h-9 w-full rounded-md border border-input bg-card pr-10 pl-9 text-xs placeholder:text-faint focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        />
        <kbd
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-2.5 hidden -translate-y-1/2 rounded-sm border bg-secondary px-1.5 text-2xs text-muted-foreground sm:inline"
        >
          /
        </kbd>
      </form>
      <Link
        href="/new"
        aria-label={nav("addStartup")}
        className="inline-flex h-9 shrink-0 items-center gap-1 rounded-md bg-primary px-2.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 sm:px-3.5"
      >
        <PlusIcon className="size-3.5" aria-hidden="true" />
        <span className="hidden sm:inline">{nav("addStartup")}</span>
      </Link>
    </div>
  );
}
