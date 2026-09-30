import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "./Card";

/** Spec 2.2 InsightCard: 40px dark icon box, UPPERCASE label, content. */
export function InsightCard({
  icon: Icon,
  label,
  children,
  wide = false,
}: {
  icon: LucideIcon;
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <Card className={cn("flex gap-3.5 p-4", wide && "sm:col-span-2")}>
      <span
        aria-hidden="true"
        className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-background text-muted-foreground"
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1 space-y-2">
        <p className="text-2xs font-bold tracking-wider text-faint uppercase">
          {label}
        </p>
        <div>{children}</div>
      </div>
    </Card>
  );
}
