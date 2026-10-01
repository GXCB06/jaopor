"use client";

import { ArrowDownIcon, ArrowUpIcon, StarIcon, XIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { localizedName } from "@/lib/config/localized";
import {
  MAX_SKILLS,
  MAX_SUPERPOWERS,
  SKILL_GROUPS,
  SKILL_GROUP_LABEL,
  SKILL_LIST,
  getSkill,
} from "@/lib/config/skills";
import { cn } from "@/lib/utils";

export type PickedSkill = { slug: string; superpower: boolean };

/**
 * Design.md §5 SkillPicker: chosen skills on top (★ = superpower, max 3; ↑/↓ reorder; ×), then
 * every skill as toggle chips grouped by discipline. Max 20.
 */
export function SkillPicker({
  value,
  onChange,
}: {
  value: PickedSkill[];
  onChange: (v: PickedSkill[]) => void;
}) {
  const t = useTranslations("Me");
  const locale = useLocale();
  const chosen = new Set(value.map((s) => s.slug));
  const stars = value.filter((s) => s.superpower).length;
  const move = (i: number, d: -1 | 1) => {
    const next = [...value];
    const j = i + d;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div className="space-y-4">
      {value.length > 0 && (
        <ol className="space-y-1.5">
          {value.map((s, i) => {
            const def = getSkill(s.slug);
            if (!def) return null;
            const canStar = s.superpower || stars < MAX_SUPERPOWERS;
            return (
              <li
                key={s.slug}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-caption",
                  s.superpower && "border-brand/60 bg-brand/10",
                )}
              >
                <button
                  type="button"
                  aria-pressed={s.superpower}
                  disabled={!canStar}
                  onClick={() =>
                    onChange(
                      value.map((x) =>
                        x.slug === s.slug
                          ? { ...x, superpower: !x.superpower }
                          : x,
                      ),
                    )
                  }
                  aria-label={t("superpowerToggle", {
                    name: localizedName(def, locale),
                  })}
                  title={t("superpower")}
                  className="text-faint hover:text-warning disabled:opacity-30 aria-pressed:text-warning"
                >
                  <StarIcon
                    className={cn("size-4", s.superpower && "fill-current")}
                    aria-hidden="true"
                  />
                </button>
                <span className="min-w-0 flex-1 truncate">
                  {localizedName(def, locale)}
                </span>
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  aria-label={t("moveUp")}
                  className="text-faint hover:text-foreground disabled:opacity-30"
                >
                  <ArrowUpIcon className="size-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === value.length - 1}
                  aria-label={t("moveDown")}
                  className="text-faint hover:text-foreground disabled:opacity-30"
                >
                  <ArrowDownIcon className="size-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onChange(value.filter((x) => x.slug !== s.slug))
                  }
                  aria-label={t("remove")}
                  className="text-faint hover:text-negative"
                >
                  <XIcon className="size-3.5" aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ol>
      )}
      <p className="text-2xs text-faint">
        {t("skillsCount", {
          n: value.length,
          max: MAX_SKILLS,
          stars,
          maxStars: MAX_SUPERPOWERS,
        })}
      </p>
      <div className="space-y-3">
        {SKILL_GROUPS.map((g) => (
          <div key={g}>
            <p className="mb-1.5 text-2xs font-semibold tracking-wider text-faint uppercase">
              {localizedName(SKILL_GROUP_LABEL[g], locale)}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {SKILL_LIST.filter((s) => s.group === g).map((s) => {
                const on = chosen.has(s.slug);
                return (
                  <button
                    key={s.slug}
                    type="button"
                    aria-pressed={on}
                    disabled={!on && value.length >= MAX_SKILLS}
                    onClick={() =>
                      onChange(
                        on
                          ? value.filter((x) => x.slug !== s.slug)
                          : [...value, { slug: s.slug, superpower: false }],
                      )
                    }
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 text-caption transition-colors disabled:opacity-40",
                      on
                        ? "border-brand/60 bg-brand/10 text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {localizedName(s, locale)}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
