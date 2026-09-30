import { TagIcon, type LucideIcon } from "lucide-react";
import { GLYPHS } from "@/lib/config/glyphs";
import { cn } from "@/lib/utils";

/**
 * Design.md §5 LogoChip glyph: a Simple Icons path in the brand colour (or a neutral when the
 * brand colour doesn't read on the chip in that theme), else the entry's lucide icon, else `Tag`
 * (custom entries).
 */
export function Glyph({
  simpleIcon,
  lucideIcon: Icon,
  className,
}: {
  simpleIcon?: string;
  lucideIcon?: LucideIcon;
  className?: string;
}) {
  const g = simpleIcon ? GLYPHS[simpleIcon] : undefined;
  if (g) {
    return (
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className={cn(
          "size-3.5 shrink-0 fill-current text-(--g-l) dark:text-(--g-d)",
          className,
        )}
        style={{ "--g-l": g.fgLight, "--g-d": g.fgDark } as React.CSSProperties}
      >
        <path d={g.path} />
      </svg>
    );
  }
  const Fallback = Icon ?? TagIcon;
  return (
    <Fallback
      aria-hidden="true"
      className={cn("size-3.5 shrink-0 text-muted-foreground", className)}
    />
  );
}

export function LogoChip({
  label,
  simpleIcon,
  lucideIcon,
  className,
  children,
}: {
  label: string;
  simpleIcon?: string;
  lucideIcon?: LucideIcon;
  className?: string;
  /** Trailing content (e.g. the remove button in the form). */
  children?: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border bg-secondary px-2.5 py-0.5 text-caption text-foreground/90",
        className,
      )}
    >
      <Glyph simpleIcon={simpleIcon} lucideIcon={lucideIcon} />
      {label}
      {children}
    </span>
  );
}
