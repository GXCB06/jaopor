import { cn } from "@/lib/utils";

/** Spec 2.2 Card: surface, border, radius 12. `interactive` adds the border-strong hover + 1px lift. */
export function Card({
  interactive = false,
  className,
  ...props
}: React.ComponentProps<"div"> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card",
        interactive &&
          "transition-[border-color,transform] hover:-translate-y-px hover:border-border-strong",
        className,
      )}
      {...props}
    />
  );
}
