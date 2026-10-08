"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { VocabCombobox } from "@/components/wizard/VocabCombobox";
import { provinceOptions } from "@/components/wizard/vocab-options";
import { POPULAR_PROVINCES, isProvince } from "@/lib/config/provinces";

/**
 * Design.md §5 province picker: searchable (Thai / English / aliases such as "กทม", "bkk"),
 * popular provinces first, "ไม่ระบุ" first because the profile province is optional (`required`:
 * no "ไม่ระบุ", for a project's province in Add-project).
 * `suggest` pre-fills an empty field from the visitor's approximate location (the live map's
 * /api/live/whoami: nearest province, Thailand only), shown as a hint; nothing is saved until the
 * form is.
 */
export function ProvinceField({
  id,
  value,
  onChange,
  suggest = false,
  required = false,
}: {
  id: string;
  value: string;
  onChange: (slug: string) => void;
  suggest?: boolean;
  required?: boolean;
}) {
  const t = useTranslations("Me");
  const locale = useLocale();
  const [suggested, setSuggested] = useState(false);
  const options = useMemo(
    () => [
      ...(required
        ? []
        : [
            { value: "", label: t("f.provinceNone"), keywords: "none ไม่ระบุ" },
          ]),
      ...provinceOptions(locale),
    ],
    [locale, t, required],
  );

  useEffect(() => {
    if (!suggest || value) return;
    let live = true;
    fetch("/api/live/whoami")
      .then((r) => (r.ok ? r.json() : null))
      .then((geo: { province?: unknown } | null) => {
        if (!live || typeof geo?.province !== "string") return;
        if (!isProvince(geo.province)) return;
        onChange(geo.province);
        setSuggested(true);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
    // Only once, when the field opens empty.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-1">
      <VocabCombobox
        id={id}
        multiple={false}
        options={options}
        value={value ? [value] : []}
        onChange={(v) => {
          setSuggested(false);
          onChange(v[0] ?? "");
        }}
        placeholder={t("f.provincePh")}
        labels={{ remove: (label) => label, noMatch: t("f.provinceNoMatch") }}
        pinned={{ values: POPULAR_PROVINCES, label: t("f.provincePopular") }}
      />
      {suggested && (
        <p className="text-2xs text-faint">{t("f.provinceSuggested")}</p>
      )}
    </div>
  );
}
