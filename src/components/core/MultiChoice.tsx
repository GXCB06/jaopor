"use client";

import { ChevronDownIcon, SearchIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Popover as P } from "radix-ui";
import { useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { alignFor, listHeight, makeRoomBelow } from "@/lib/ui/room-below";

// Design.md §5 Dropdowns: the multi-choice filter dropdown. Opens below the trigger (never up),
// as wide as the trigger, capped to the room underneath. Inside a GET form it posts one hidden
// field, the chosen values joined by commas (e.g. category=saas,ai); any of them matches.

export type MultiOption = {
  value: string;
  label: string;
  /** Extra words the search box matches (English name, aliases). */
  keywords?: string;
};
export type MultiGroup = { label: string; options: MultiOption[] };

/** Lists longer than this get a search box. */
const SEARCH_FROM = 12;

export function MultiChoice({
  id,
  name,
  value: controlled,
  defaultValue = [],
  onValueChange,
  options = [],
  groups = [],
  placeholder,
  className,
  "aria-label": ariaLabel,
}: {
  id?: string;
  name?: string;
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (v: string[]) => void;
  options?: MultiOption[];
  groups?: MultiGroup[];
  /** Trigger text with nothing chosen, e.g. "ทุกหมวดหมู่". */
  placeholder: string;
  className?: string;
  "aria-label"?: string;
}) {
  const t = useTranslations("Choice");
  const [own, setOwn] = useState(defaultValue);
  const selected = controlled ?? own;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [maxHeight, setMaxHeight] = useState<number>();
  const [align, setAlign] = useState<"start" | "end">("start");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listId = useId();

  const all = [...options, ...groups.flatMap((g) => g.options)];
  const order = new Map(all.map((o, i) => [o.value, i]));
  const searchable = all.length > SEARCH_FROM;

  const set = (next: string[]) => {
    const sorted = [...new Set(next)]
      .filter((v) => order.has(v))
      .sort((a, b) => order.get(a)! - order.get(b)!);
    if (controlled === undefined) setOwn(sorted);
    onValueChange?.(sorted);
  };
  const toggle = (v: string) =>
    set(
      selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v],
    );

  const openChange = (next: boolean) => {
    if (next && triggerRef.current) setAlign(alignFor(triggerRef.current));
    if (next && triggerRef.current)
      setMaxHeight(
        makeRoomBelow(
          triggerRef.current,
          // + search box and footer
          listHeight(all.length, groups.length, (searchable ? 44 : 0) + 44),
        ),
      );
    if (!next) setQuery("");
    setOpen(next);
  };

  const q = query.trim().toLowerCase();
  const matches = (o: MultiOption) =>
    !q || `${o.label} ${o.keywords ?? ""}`.toLowerCase().includes(q);
  const shownOptions = options.filter(matches);
  const shownGroups = groups
    .map((g) => ({ ...g, options: g.options.filter(matches) }))
    .filter((g) => g.options.length > 0);

  const labelOf = (v: string) => all.find((o) => o.value === v)?.label ?? v;
  const summary =
    selected.length === 0
      ? placeholder
      : selected.length === 1
        ? labelOf(selected[0])
        : `${labelOf(selected[0])} ${t("more", { count: selected.length - 1 })}`;

  const row = (o: MultiOption) => (
    <label
      key={o.value}
      className="flex cursor-pointer items-center gap-2.5 rounded-sm px-2.5 py-2 text-sm select-none hover:bg-accent has-focus-visible:bg-accent"
    >
      <input
        type="checkbox"
        checked={selected.includes(o.value)}
        onChange={() => toggle(o.value)}
        className="size-4 shrink-0 accent-(--brand)"
      />
      <span className="min-w-0">{o.label}</span>
    </label>
  );

  return (
    <span className="relative block w-full">
      <P.Root open={open} onOpenChange={openChange}>
        <P.Trigger asChild>
          <button
            ref={triggerRef}
            id={id}
            type="button"
            aria-label={ariaLabel}
            aria-controls={open ? listId : undefined}
            className={cn(
              "inline-flex h-8 w-full min-w-0 items-center justify-between gap-1.5 rounded-md border border-input bg-background px-2 text-left text-caption outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              selected.length === 0 && "text-muted-foreground",
              className,
            )}
          >
            <span className="min-w-0 truncate">{summary}</span>
            {selected.length > 1 && (
              <span className="sr-only">
                {selected.map(labelOf).join(", ")}
              </span>
            )}
            <ChevronDownIcon
              className="size-3.5 shrink-0 text-faint"
              aria-hidden="true"
            />
          </button>
        </P.Trigger>
        <P.Portal>
          <P.Content
            id={listId}
            side="bottom"
            align={align}
            sideOffset={4}
            avoidCollisions={false}
            // Ours (room made before opening) and Radix's live one (content above may still shift).
            style={{
              maxHeight: `min(${maxHeight ?? 352}px, var(--radix-popover-content-available-height))`,
            }}
            // A phone keyboard popping up would eat the room we just made: focus stays put.
            onOpenAutoFocus={(e) => {
              if (window.matchMedia("(pointer: coarse)").matches)
                e.preventDefault();
            }}
            className="z-50 flex max-h-88 w-(--radix-popover-trigger-width) max-w-[calc(100vw-1rem)] min-w-56 flex-col overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md"
          >
            {searchable && (
              <div className="relative shrink-0 border-b p-1.5">
                <SearchIcon
                  className="pointer-events-none absolute top-1/2 left-3.5 size-3.5 -translate-y-1/2 text-faint"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("search")}
                  aria-label={t("search")}
                  className="h-8 w-full rounded-sm bg-transparent pr-2 pl-8 text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>
            )}
            <div
              role="group"
              aria-label={ariaLabel}
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1"
            >
              {shownOptions.map(row)}
              {shownGroups.map((g) => (
                <div key={g.label} role="group" aria-label={g.label}>
                  <p className="px-2.5 pt-2 pb-1 text-2xs font-semibold text-faint">
                    {g.label}
                  </p>
                  {g.options.map(row)}
                </div>
              ))}
              {shownOptions.length === 0 && shownGroups.length === 0 && (
                <p className="px-2.5 py-3 text-caption text-muted-foreground">
                  {t("noMatch")}
                </p>
              )}
            </div>
            <div className="flex shrink-0 items-center justify-between gap-2 border-t px-2 py-1.5">
              <button
                type="button"
                onClick={() => set([])}
                disabled={selected.length === 0}
                className="rounded-sm px-1.5 py-1 text-caption text-muted-foreground hover:text-foreground disabled:opacity-40"
              >
                {t("clear")}
              </button>
              <span className="text-caption text-faint tabular-nums">
                {t("selected", { count: selected.length })}
              </span>
              <P.Close className="rounded-sm px-2 py-1 text-caption font-semibold text-brand-text hover:underline">
                {t("done")}
              </P.Close>
            </div>
          </P.Content>
        </P.Portal>
      </P.Root>
      {name && <input type="hidden" name={name} value={selected.join(",")} />}
    </span>
  );
}
