"use client";

import { XIcon, type LucideIcon } from "lucide-react";
import { useId, useMemo, useRef, useState } from "react";
import { Glyph, LogoChip } from "@/components/core/LogoChip";
import { cn } from "@/lib/utils";
import { inputClass } from "./fields";

export type VocabOption = {
  value: string;
  label: string;
  /** Extra text that should also match the search (e.g. the other language's name). */
  keywords?: string;
  group?: string;
  simpleIcon?: string;
  lucideIcon?: LucideIcon;
};

// Thai tone marks / vowels shouldn't block a match ("เชียงใหม" still finds "เชียงใหม่").
const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯัิ-ฺ็-๎]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "");

/**
 * Design.md §5 VocabCombobox (spec 6.9): searchable select with logo chips. `multiple` keeps
 * chips with × above the input; single mode shows the chosen option in the input.
 * Keyboard: ↑/↓ move, Enter picks, Esc closes, Backspace on an empty input removes the last chip.
 */
export function VocabCombobox({
  id,
  options,
  value,
  onChange,
  multiple = true,
  max = 12,
  placeholder,
  customLabel,
  toCustom,
  describeCustom,
  required,
  labels,
}: {
  id: string;
  options: VocabOption[];
  value: string[];
  onChange: (v: string[]) => void;
  multiple?: boolean;
  max?: number;
  placeholder: string;
  /** "+ เพิ่ม “{text}”" row label; with `toCustom`, free text becomes a value. */
  customLabel?: (text: string) => string;
  toCustom?: (text: string) => string;
  /** Label for a selected value that isn't an option (custom entries). */
  describeCustom?: (value: string) => string;
  required?: boolean;
  labels: { remove: (label: string) => string; noMatch: string };
}) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const byValue = useMemo(
    () => new Map(options.map((o) => [o.value, o])),
    [options],
  );
  const selected = value.map(
    (v) => byValue.get(v) ?? { value: v, label: describeCustom?.(v) ?? v },
  );
  const q = norm(query);
  const matches = options.filter(
    (o) =>
      !(multiple && value.includes(o.value)) &&
      (!q || norm(`${o.label} ${o.keywords ?? ""} ${o.value}`).includes(q)),
  );
  const custom =
    toCustom && query.trim() && !matches.some((m) => norm(m.label) === q)
      ? toCustom(query.trim())
      : null;
  const rows: VocabOption[] = [
    ...matches,
    ...(custom && !value.includes(custom)
      ? [{ value: custom, label: customLabel?.(query.trim()) ?? query.trim() }]
      : []),
  ];
  const full = multiple && value.length >= max;

  const pick = (o: VocabOption) => {
    if (multiple) {
      if (!full) onChange([...value, o.value]);
      setQuery("");
    } else {
      onChange([o.value]);
      setQuery("");
      setOpen(false);
    }
    setActive(0);
    inputRef.current?.focus();
  };
  const remove = (v: string) => onChange(value.filter((x) => x !== v));

  let lastGroup: string | undefined;
  const single = !multiple ? selected[0] : undefined;

  return (
    <div className="relative space-y-2">
      {multiple && selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((o) => (
            <LogoChip
              key={o.value}
              label={o.label}
              simpleIcon={"simpleIcon" in o ? o.simpleIcon : undefined}
              lucideIcon={"lucideIcon" in o ? o.lucideIcon : undefined}
              className="pr-1"
            >
              <button
                type="button"
                onClick={() => remove(o.value)}
                aria-label={labels.remove(o.label)}
                className="ml-0.5 inline-flex size-4 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <XIcon className="size-3" aria-hidden="true" />
              </button>
            </LogoChip>
          ))}
        </div>
      )}
      <div className="relative">
        {single && !open && (
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2">
            <Glyph
              simpleIcon={single.simpleIcon}
              lucideIcon={single.lucideIcon}
            />
          </span>
        )}
        <input
          ref={inputRef}
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            open && rows[active] ? `${listId}-${active}` : undefined
          }
          autoComplete="off"
          required={required && !value.length}
          disabled={full}
          placeholder={single ? "" : placeholder}
          value={open || !single ? query : single.label}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setActive((a) => Math.min(rows.length - 1, a + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(0, a - 1));
            } else if (e.key === "Enter") {
              if (open && rows[active]) {
                e.preventDefault();
                pick(rows[active]);
              }
            } else if (e.key === "Escape") {
              setOpen(false);
            } else if (
              e.key === "Backspace" &&
              !query &&
              multiple &&
              value.length
            ) {
              remove(value[value.length - 1]);
            }
          }}
          className={cn(inputClass, single && !open && "pl-8")}
        />
        {open && (
          <ul
            id={listId}
            role="listbox"
            className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-popover p-1 text-sm shadow-md"
          >
            {rows.length === 0 && (
              <li className="px-2 py-1.5 text-caption text-muted-foreground">
                {labels.noMatch}
              </li>
            )}
            {rows.map((o, i) => {
              const header = o.group && o.group !== lastGroup ? o.group : null;
              lastGroup = o.group;
              return (
                <li key={o.value} role="presentation">
                  {header && (
                    <p className="px-2 pt-2 pb-1 text-2xs font-semibold tracking-wider text-faint uppercase">
                      {header}
                    </p>
                  )}
                  <div
                    id={`${listId}-${i}`}
                    role="option"
                    aria-selected={i === active}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pick(o)}
                    onMouseEnter={() => setActive(i)}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5",
                      i === active && "bg-accent",
                    )}
                  >
                    <Glyph
                      simpleIcon={o.simpleIcon}
                      lucideIcon={o.lucideIcon}
                    />
                    {o.label}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
