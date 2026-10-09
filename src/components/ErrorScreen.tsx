import type { ReactNode } from "react";
import { BrandMark } from "@/components/BrandLogo";

/**
 * Design.md §5 Not-found and error pages. Strings and actions come from the caller, so the global
 * error page (which has no intl provider or layout) can use it too. Never renders the error itself.
 */
export function ErrorScreen({
  code,
  title,
  body,
  reference,
  actions,
}: {
  code: string;
  title: string;
  body: string;
  /** "รหัสอ้างอิง: …" built from Next's opaque digest, or nothing. */
  reference?: string | null;
  actions: ReactNode;
}) {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <BrandMark className="size-10" />
      <div className="space-y-2">
        <p className="font-mono text-caption text-faint tabular-nums">{code}</p>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="text-sm break-words text-muted-foreground">{body}</p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {actions}
      </div>
      {reference && <p className="text-2xs text-faint">{reference}</p>}
    </main>
  );
}
