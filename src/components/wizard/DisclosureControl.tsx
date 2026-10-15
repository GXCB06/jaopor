"use client";

import { EyeIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { setStartupDisclosure } from "@/app/actions/disclosure";
import {
  DEFAULT_LEVEL_FOR_NEW_CONNECTION,
  DISCLOSURE_LEVELS,
  type DisclosureLevel,
  type MetricDisclosure,
  type MetricGroup,
} from "@/lib/disclosure";
import { cn } from "@/lib/utils";

/**
 * Design.md §7 disclosure levels / docs/DISCLOSURE_SURFACE_AUDIT.md C9 ("ใครเห็นตัวเลขนี้?"):
 * after a source connects, the owner picks what visitors see for that group — the real figures, a
 * range, the growth %, a bare badge, or nothing. The choice is saved immediately (the row already
 * exists), so it works both in the wizard's step 2 and the product's settings. The database trigger
 * validates it and recomputes `public_*`; a failed save reverts the selection (never a false
 * success).
 */
export function DisclosureControl({
  startupId,
  groups,
  initialLevels,
  onChange,
}: {
  startupId: number;
  /** The groups to offer, in order (only ones the owner has actually connected). */
  groups: MetricGroup[];
  /** The owner's stored levels ({} = the database defaults still apply). */
  initialLevels: MetricDisclosure;
  /** Reports the saved levels, so a parent can keep a copy. */
  onChange?: (levels: MetricDisclosure) => void;
}) {
  const t = useTranslations("DisclosureControl");
  const [levels, setLevels] = useState<MetricDisclosure>(initialLevels);
  const [saving, setSaving] = useState<MetricGroup | null>(null);

  if (groups.length === 0) return null;

  async function pick(group: MetricGroup, level: DisclosureLevel) {
    if (saving) return;
    const current = levels[group] ?? DEFAULT_LEVEL_FOR_NEW_CONNECTION[group];
    if (current === level) return;
    const before = levels;
    setLevels((l) => ({ ...l, [group]: level }));
    setSaving(group);
    const res = await setStartupDisclosure(startupId, group, level);
    setSaving(null);
    if (!res.ok) {
      setLevels(before);
      toast.error(t("saveFailed"));
      return;
    }
    setLevels(res.levels);
    onChange?.(res.levels);
    toast.success(t("saved"));
  }

  return (
    <div className="space-y-4">
      <div className="space-y-0.5">
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <EyeIcon className="size-4 shrink-0 text-brand-text" aria-hidden="true" />
          {t("title")}
        </p>
        <p className="text-caption text-muted-foreground">{t("subtitle")}</p>
      </div>

      {groups.map((group) => {
        const current = levels[group] ?? DEFAULT_LEVEL_FOR_NEW_CONNECTION[group];
        const busy = saving === group;
        return (
          <fieldset key={group} className="space-y-2">
            <legend className="text-caption font-medium">
              {t(`group.${group}`)}
            </legend>
            <div
              role="radiogroup"
              aria-label={t(`group.${group}`)}
              className="grid gap-1.5 sm:grid-cols-2"
            >
              {DISCLOSURE_LEVELS.map((level) => {
                const selected = current === level;
                return (
                  <label
                    key={level}
                    className={cn(
                      "flex cursor-pointer items-start gap-2 rounded-lg border p-2.5 transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                      busy && "opacity-70",
                      selected
                        ? "border-brand bg-brand/5"
                        : "bg-card hover:bg-accent",
                    )}
                  >
                    <input
                      type="radio"
                      name={`disclosure-${startupId}-${group}`}
                      value={level}
                      checked={selected}
                      disabled={busy}
                      onChange={() => pick(group, level)}
                      className="sr-only"
                    />
                    <span
                      className={cn(
                        "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors",
                        selected ? "border-brand" : "border-input",
                      )}
                      aria-hidden="true"
                    >
                      {selected && (
                        <span className="size-2 rounded-full bg-brand" />
                      )}
                    </span>
                    <span className="min-w-0 space-y-0.5">
                      <span className="block text-caption font-semibold">
                        {t(`level.${level}.label`)}
                      </span>
                      <span className="block text-2xs text-muted-foreground">
                        {t(`level.${level}.desc`)}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}
