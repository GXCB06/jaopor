import { cn } from "@/lib/utils";

/** Range / year buttons in the profile chart card's toolbar (Design.md §6 Profile revenue dashboard). */
export const toolbarButton = (active: boolean) =>
  cn(
    "inline-flex h-8 items-center rounded-lg border px-3 text-2xs tabular-nums transition-colors",
    active
      ? "border-border-strong bg-secondary font-bold text-foreground"
      : "text-muted-foreground hover:text-foreground",
  );
