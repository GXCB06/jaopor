"use client";

import { CheckIcon, Loader2Icon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { checkHandle } from "@/app/actions/profile";
import { inputClass } from "@/components/wizard/fields";
import { cn } from "@/lib/utils";

export type HandleState =
  "idle" | "checking" | "ok" | "invalid" | "reserved" | "taken";

/**
 * Username with a live availability check (400 ms debounce; the server rechecks on save).
 * The current handle counts as available (handle_available ignores my own row).
 */
export function HandleField({
  id,
  value,
  onChange,
  onState,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  onState?: (s: HandleState) => void;
}) {
  const t = useTranslations("Me");
  const [state, setState] = useState<HandleState>("idle");

  useEffect(() => {
    const v = value.trim().toLowerCase();
    if (!v) return;
    let alive = true;
    const timer = setTimeout(async () => {
      if (!alive) return;
      setState("checking");
      onState?.("checking");
      const r = await checkHandle(v);
      if (!alive) return;
      setState(r);
      onState?.(r);
    }, 400);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onState is a setter
  }, [value]);

  const shown = value.trim() ? state : "idle";
  return (
    <div className="space-y-1">
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-faint">
          @
        </span>
        <input
          id={id}
          value={value}
          onChange={(e) =>
            onChange(
              e.target.value
                .toLowerCase()
                .replace(/[^a-z0-9_]/g, "")
                .slice(0, 30),
            )
          }
          autoComplete="username"
          spellCheck={false}
          aria-describedby={`${id}-status`}
          className={cn(inputClass, "pr-9 pl-7")}
        />
        <span
          className="absolute top-1/2 right-3 -translate-y-1/2"
          aria-hidden="true"
        >
          {shown === "checking" && (
            <Loader2Icon className="size-4 animate-spin text-faint" />
          )}
          {shown === "ok" && <CheckIcon className="size-4 text-positive" />}
          {(shown === "invalid" ||
            shown === "reserved" ||
            shown === "taken") && <XIcon className="size-4 text-negative" />}
        </span>
      </div>
      <p
        id={`${id}-status`}
        aria-live="polite"
        className={cn(
          "text-2xs",
          shown === "ok"
            ? "text-positive"
            : shown === "idle" || shown === "checking"
              ? "text-faint"
              : "text-negative",
        )}
      >
        {t(`handle.${shown}`)}
      </p>
    </div>
  );
}
