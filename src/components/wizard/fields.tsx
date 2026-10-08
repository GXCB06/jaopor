"use client";

import { cn } from "@/lib/utils";

// Native form controls styled to Design.md §5 (SearchBar/Input tokens). Native <select> keeps
// mobile pickers usable and needs no extra primitive.

export const inputClass =
  "h-9 w-full rounded-md border border-input bg-input/30 px-3 text-sm placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-50";

export function Field({
  id,
  label,
  hint,
  optional,
  htmlFor,
  children,
  className,
  action,
}: {
  /** Anchor id for deep links like /dashboard/[id]/edit#pricing */
  id?: string;
  label: string;
  hint?: string;
  optional?: string;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
  /** Rendered at the end of the label row (e.g. a VisibilityMenu); kept outside the <label>. */
  action?: React.ReactNode;
}) {
  const labelEl = (
    <label
      htmlFor={htmlFor}
      className="flex items-baseline gap-2 text-xs font-medium"
    >
      {label}
      {optional && (
        <span className="text-2xs font-normal text-muted-foreground">
          ({optional})
        </span>
      )}
    </label>
  );
  return (
    <div
      id={id}
      className={cn("scroll-mt-24 space-y-1.5 transition-shadow", className)}
    >
      {action ? (
        <div className="flex items-center justify-between gap-2">
          {labelEl}
          {action}
        </div>
      ) : (
        labelEl
      )}
      {children}
      {hint && <p className="text-caption text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function Select({
  id,
  value,
  onChange,
  options,
  placeholder,
  required,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  /** With a placeholder: the browser refuses to submit until a real option is chosen. */
  required?: boolean;
}) {
  return (
    <select
      id={id}
      required={required}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={inputClass}
    >
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function ToggleChips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: T; label: string }>;
  value: T[];
  onChange: (v: T[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() =>
              onChange(
                on ? value.filter((v) => v !== o.value) : [...value, o.value],
              )
            }
            className={cn(
              "rounded-md border px-2 py-0.5 text-xs transition-colors",
              on
                ? "border-brand/60 text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
