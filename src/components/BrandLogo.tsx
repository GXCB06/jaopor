import { cn } from "@/lib/utils";

/** MRRMafia mark: crimson tile with a fedora silhouette + wordmark. Our own identity (Design.md §2 ★). */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={cn("size-6", className)}
    >
      <rect width="24" height="24" rx="6" className="fill-brand" />
      <path
        d="M5 15.5c2.2.9 4.5 1.3 7 1.3s4.8-.4 7-1.3M7.5 14.6l1.1-5.2c.2-.9 1-1.4 1.9-1.2l1.5.4 1.5-.4c.9-.2 1.7.3 1.9 1.2l1.1 5.2"
        className="fill-none stroke-brand-foreground"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BrandLogo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 font-bold tracking-tight",
        className,
      )}
    >
      <BrandMark />
      <span>MRRMafia</span>
    </span>
  );
}
