import { PlusIcon, SearchIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

/** Design.md §5 SearchBar — plain GET form to the directory (works without JS). */
export function SearchBar({
  locale,
  defaultValue,
}: {
  locale: string;
  defaultValue?: string;
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
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          name="q"
          defaultValue={defaultValue}
          placeholder={t("searchPlaceholder")}
          maxLength={60}
          className="h-9 w-full rounded-md border border-input bg-input/30 pr-3 pl-10 text-sm placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        />
      </form>
      <Button asChild variant="secondary" className="px-4">
        <Link href="/new">
          <PlusIcon />
          {nav("addStartup")}
        </Link>
      </Button>
    </div>
  );
}
