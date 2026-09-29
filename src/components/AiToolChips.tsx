import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AI_TOOLS, type AiTool } from "@/lib/catalog";
import { cn } from "@/lib/utils";

/** "Built with Claude Code / OpenCode / …" filter chips (MRRMafia-specific, Design.md §5 InsightsGrid). */
export function AiToolChips({
  active,
  tools = AI_TOOLS,
}: {
  active?: AiTool;
  tools?: readonly AiTool[];
}) {
  const tool = useTranslations("Catalog.tool");
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {tools
        .filter((t) => t !== "other")
        .map((t) => (
          <Link
            key={t}
            href={{ pathname: "/startups", query: { tool: t } }}
            className={cn(
              "rounded-md border px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground",
              active === t && "border-brand/60 text-foreground",
            )}
          >
            {tool(t)}
          </Link>
        ))}
    </div>
  );
}
