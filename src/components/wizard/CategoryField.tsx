"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";
import { VocabCombobox } from "./VocabCombobox";
import { categoryOptions } from "./vocab-options";

/** Shown on top before anything is typed. */
const POPULAR_CATEGORIES = [
  "ai",
  "saas",
  "ecommerce",
  "productivity",
  "education",
  "games",
] as const;

/**
 * Design.md §5 category picker (owner request 2026-10-11): type to find a category (Thai, English
 * or a common word such as "เกม", "ร้านค้า", "บัญชี"), each with its icon; popular ones first.
 */
export function CategoryField({
  id,
  value,
  onChange,
  required = false,
  suggestion = null,
}: {
  id: string;
  value: string;
  onChange: (slug: string) => void;
  required?: boolean;
  /** Read from the pasted website; offered as a chip while nothing is chosen. */
  suggestion?: string | null;
}) {
  const t = useTranslations("CategoryPicker");
  const locale = useLocale();
  const options = useMemo(() => categoryOptions(locale), [locale]);
  const suggested = suggestion
    ? options.find((o) => o.value === suggestion)
    : undefined;
  // Offered as a one-click chip while the field is empty; shown as a plain note once preselected.
  const offered = !value ? suggested : undefined;
  const autoFilled = Boolean(suggested && value === suggested.value);
  const Icon = suggested?.lucideIcon;
  return (
    <div className="space-y-1.5">
      <VocabCombobox
        id={id}
        multiple={false}
        required={required}
        options={options}
        value={value ? [value] : []}
        onChange={(v) => onChange(v[0] ?? "")}
        placeholder={t("placeholder")}
        labels={{ remove: (label) => label, noMatch: t("noMatch") }}
        pinned={{ values: POPULAR_CATEGORIES, label: t("popular") }}
      />
      {offered && (
        <p className="flex flex-wrap items-center gap-1.5 text-caption text-muted-foreground">
          {t("suggested")}
          <button
            type="button"
            onClick={() => onChange(offered.value)}
            className="inline-flex items-center gap-1 rounded-full border border-brand/40 bg-brand/5 px-2.5 py-0.5 font-semibold text-brand-text hover:bg-brand/10"
          >
            {Icon && <Icon className="size-3.5" aria-hidden="true" />}
            {offered.label}
          </button>
        </p>
      )}
      {autoFilled && (
        <p className="flex flex-wrap items-center gap-1.5 text-caption text-muted-foreground">
          {Icon && <Icon className="size-3.5" aria-hidden="true" />}
          {t("autoFilled")}
        </p>
      )}
    </div>
  );
}
