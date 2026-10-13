import { cn } from "@/lib/utils";

/** Spec 2.2 Card: surface, border, radius 12, hairline shadow. `interactive` adds the border-strong hover + 1px lift. */
export function Card({
  interactive = false,
  className,
  ...props
}: React.ComponentProps<"div"> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        // shadow-xs: the hairline that lifts white cards off the grey light page (Design.md §2).
        "rounded-xl border bg-card shadow-xs",
        interactive &&
          "transition-[border-color,transform] hover:-translate-y-px hover:border-border-strong",
        className,
      )}
      {...props}
    />
  );
}
