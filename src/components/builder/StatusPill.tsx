import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

const TONE: Record<string, { pill: string; dot: string }> = {
  looking_cofounder: {
    pill: "border-positive/30 bg-positive/10 text-positive",
    dot: "bg-positive",
  },
  open_to_work: {
    pill: "border-positive/30 bg-positive/10 text-positive",
    dot: "bg-positive",
  },
  networking: {
    pill: "border-brand/40 bg-brand/10 text-brand-text",
    dot: "bg-brand",
  },
  busy: { pill: "bg-secondary text-muted-foreground", dot: "bg-faint" },
};

/** Design.md §5 StatusPill: the builder's status with a dot; tone by status. */
export function StatusPill({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const t = useTranslations("Builder");
  const tone = TONE[status] ?? TONE.busy;
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-2xs font-semibold",
        tone.pill,
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn("size-1.5 rounded-full", tone.dot)}
      />
      {t(`status.${status}` as "status.networking")}
    </span>
  );
}
