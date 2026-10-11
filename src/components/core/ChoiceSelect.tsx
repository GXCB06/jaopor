"use client";

import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { Select as S } from "radix-ui";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { listHeight, makeRoomBelow } from "@/lib/ui/room-below";

// Design.md §5 Dropdowns: the one single-choice dropdown (replaces native <select>, whose popup
// the browser may open upward and past the screen edge). Always opens below the trigger, as wide
// as the trigger or wider, and never taller than the room underneath.

export type ChoiceOption = { value: string; label: string; disabled?: boolean };
export type ChoiceGroup = { label: string; options: ChoiceOption[] };

const TRIGGER = {
  /** Forms (wizard, edit page, profile editor): same box as inputClass. */
  field:
    "h-9 w-full rounded-md border border-input bg-input/30 px-3 text-sm focus-visible:ring-3 focus-visible:ring-ring/50",
  /** Filter sidebars. */
  filter:
    "h-8 w-full rounded-md border border-input bg-background px-2 text-caption",
  /** Compact dropdown button (leaderboard metric, chart range). */
  chip: "h-7 rounded-lg border bg-secondary px-2.5 text-xs",
} as const;

// Radix needs a non-empty value per item; "" (e.g. "ทุกหมวดหมู่") travels as this token.
const EMPTY = "__jaopor_empty__";
const toItem = (v: string) => (v === "" ? EMPTY : v);
const fromItem = (v: string) => (v === EMPTY ? "" : v);

export function ChoiceSelect({
  id,
  name,
  value: controlled,
  defaultValue = "",
  onValueChange,
  options = [],
  groups = [],
  placeholder,
  required,
  disabled,
  variant = "field",
  fullWidth = variant !== "chip",
  className,
  "aria-label": ariaLabel,
}: {
  id?: string;
  /** Form field name: the value is posted through a hidden input (works in GET forms). */
  name?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (v: string) => void;
  options?: ChoiceOption[];
  groups?: ChoiceGroup[];
  /** Shown while the value is "" and no "" option exists. */
  placeholder?: string;
  /** With a placeholder: the browser refuses to submit until a real option is chosen. */
  required?: boolean;
  disabled?: boolean;
  variant?: keyof typeof TRIGGER;
  /** Stretch to the container (default for field / filter). */
  fullWidth?: boolean;
  className?: string;
  "aria-label"?: string;
}) {
  const [own, setOwn] = useState(defaultValue);
  const value = controlled ?? own;
  const [open, setOpen] = useState(false);
  const [maxHeight, setMaxHeight] = useState<number>();
  const triggerRef = useRef<HTMLButtonElement>(null);

  const all = [...options, ...groups.flatMap((g) => g.options)];
  const hasEmpty = all.some((o) => o.value === "");
  const rootValue = value === "" && !hasEmpty ? "" : toItem(value);

  const change = (v: string) => {
    const next = fromItem(v);
    if (controlled === undefined) setOwn(next);
    onValueChange?.(next);
  };
  const openChange = (next: boolean) => {
    if (next && triggerRef.current)
      setMaxHeight(
        makeRoomBelow(
          triggerRef.current,
          listHeight(all.length, groups.length),
        ),
      );
    setOpen(next);
  };

  const item = (o: ChoiceOption) => (
    <S.Item
      key={o.value}
      value={toItem(o.value)}
      disabled={o.disabled}
      className="relative flex w-full cursor-default items-center rounded-sm py-2 pr-8 pl-2.5 text-sm outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-[state=checked]:font-semibold data-disabled:pointer-events-none data-disabled:opacity-50"
    >
      <S.ItemText>{o.label}</S.ItemText>
      <S.ItemIndicator className="absolute right-2 inline-flex items-center">
        <CheckIcon className="size-4 text-brand-text" aria-hidden="true" />
      </S.ItemIndicator>
    </S.Item>
  );

  return (
    <span className={cn("relative inline-flex min-w-0", fullWidth && "w-full")}>
      <S.Root
        value={rootValue}
        onValueChange={change}
        open={open}
        onOpenChange={openChange}
        disabled={disabled}
      >
        <S.Trigger
          ref={triggerRef}
          id={id}
          aria-label={ariaLabel}
          className={cn(
            "inline-flex min-w-0 items-center justify-between gap-1.5 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 data-placeholder:text-muted-foreground",
            TRIGGER[variant],
            className,
          )}
        >
          <span className="min-w-0 truncate">
            <S.Value placeholder={placeholder} />
          </span>
          <S.Icon asChild>
            <ChevronDownIcon
              className="size-3.5 shrink-0 text-faint"
              aria-hidden="true"
            />
          </S.Icon>
        </S.Trigger>
        <S.Portal>
          <S.Content
            position="popper"
            side="bottom"
            align="start"
            sideOffset={4}
            style={maxHeight ? { maxHeight } : undefined}
            className="z-50 max-h-88 max-w-[calc(100vw-1rem)] min-w-(--radix-select-trigger-width) overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md"
          >
            <S.ScrollUpButton className="flex h-6 items-center justify-center text-muted-foreground">
              <ChevronUpIcon className="size-4" aria-hidden="true" />
            </S.ScrollUpButton>
            <S.Viewport className="p-1">
              {options.map(item)}
              {groups.map((g) => (
                <S.Group key={g.label}>
                  <S.Label className="px-2.5 pt-2 pb-1 text-2xs font-semibold text-faint">
                    {g.label}
                  </S.Label>
                  {g.options.map(item)}
                </S.Group>
              ))}
            </S.Viewport>
            <S.ScrollDownButton className="flex h-6 items-center justify-center text-muted-foreground">
              <ChevronDownIcon className="size-4" aria-hidden="true" />
            </S.ScrollDownButton>
          </S.Content>
        </S.Portal>
      </S.Root>
      {/* Posted value; with `required`, an empty one blocks submit and the bubble points here. */}
      {name !== undefined || required ? (
        <input
          tabIndex={-1}
          aria-hidden="true"
          name={name}
          required={required}
          value={value}
          onChange={() => {}}
          onFocus={() => triggerRef.current?.focus()}
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px opacity-0"
        />
      ) : null}
    </span>
  );
}
