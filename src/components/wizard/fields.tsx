"use client";

import { useLocale } from "next-intl";
import { localizedName } from "@/lib/config/localized";
import { PROVINCE_LIST, REGION_LIST } from "@/lib/config/provinces";
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
}: {
  /** Anchor id for deep links like /dashboard/[id]/edit#pricing */
  id?: string;
  label: string;
  hint?: string;
  optional?: string;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      id={id}
      className={cn("scroll-mt-24 space-y-1.5 transition-shadow", className)}
    >
      <label
        htmlFor={htmlFor}
        className="flex items-baseline gap-2 text-xs font-medium"
      >
        {label}
        {optional && (
          <span className="text-[10px] font-normal text-muted-foreground">
            ({optional})
          </span>
        )}
      </label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function Select({
  id,
  value,
  onChange,
  options,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
}) {
  return (
    <select
      id={id}
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

/** Spec 6.9 province select: 77 provinces grouped by region, names in the page language. */
export function ProvinceSelect({
  id,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const locale = useLocale();
  const collator = new Intl.Collator(locale);
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={inputClass}
    >
      <option value="">{placeholder}</option>
      {REGION_LIST.map((r) => (
        <optgroup key={r.slug} label={localizedName(r, locale)}>
          {PROVINCE_LIST.filter((p) => p.region === r.slug)
            .map((p) => ({ slug: p.slug, name: localizedName(p, locale) }))
            .sort((a, b) => collator.compare(a.name, b.name))
            .map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.name}
              </option>
            ))}
        </optgroup>
      ))}
    </select>
  );
}
