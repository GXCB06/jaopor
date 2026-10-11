"use client";

import { ChoiceSelect } from "@/components/core/ChoiceSelect";
import { useTranslations } from "next-intl";
import {
  LINK_CHOICES,
  type LinkChoice,
  type checkProjectLink,
} from "@/lib/links";
import { linkChoiceLabel, linkProblemText } from "./link-text";

/**
 * A1.2 (Design.md §5 Add-startup wizard): what we detected, a control to correct it, and what it
 * means. Never a silent guess: a platform page says it can't count visitors; a problem says why.
 */
export function LinkTypeStatus({
  check,
  choice,
  onChoice,
}: {
  check: NonNullable<ReturnType<typeof checkProjectLink>>;
  choice: LinkChoice | null;
  onChoice: (c: LinkChoice | null) => void;
}) {
  const lt = useTranslations("Links");
  const value = choice ?? check.detected;
  return (
    <div className="space-y-1.5" aria-live="polite">
      {value && (
        <label className="flex flex-wrap items-center gap-2 text-caption text-muted-foreground">
          <span>{lt("type")}</span>
          <ChoiceSelect
            variant="filter"
            aria-label={lt("type")}
            value={value}
            onValueChange={(v) => {
              const next = v as LinkChoice;
              onChoice(next === check.detected ? null : next);
            }}
            options={LINK_CHOICES.map((c) => ({
              value: c,
              label: linkChoiceLabel(lt, c),
            }))}
            fullWidth={false}
            className="w-auto text-foreground"
          />
          {!choice && check.detected && (
            <span className="text-faint">{lt("autoDetected")}</span>
          )}
        </label>
      )}
      {check.ok ? (
        check.platform ? (
          <p className="text-caption text-muted-foreground">
            {lt("platformNote", {
              platform: lt(`platforms.${check.platform}`),
            })}
          </p>
        ) : null
      ) : (
        <p role="alert" className="text-caption text-destructive">
          {linkProblemText(lt, check, choice)}
        </p>
      )}
    </div>
  );
}
