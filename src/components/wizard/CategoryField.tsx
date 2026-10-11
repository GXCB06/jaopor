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
}: {
  id: string;
  value: string;
  onChange: (slug: string) => void;
  required?: boolean;
}) {
  const t = useTranslations("CategoryPicker");
  const locale = useLocale();
  const options = useMemo(() => categoryOptions(locale), [locale]);
  return (
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
  );
}
