"use client";

import {
  BadgeCheckIcon,
  CheckIcon,
  CircleCheckIcon,
  EyeIcon,
  EyeOffIcon,
  GlobeIcon,
  PencilLineIcon,
  SparklesIcon,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/core/Card";
import { cn } from "@/lib/utils";

// Design.md §5 Add-startup wizard v3 (owner 2026-10-13: "plain text … no interactive experience"):
// a three-step stepper and the numbered section cards of step 1.

/** v4: ① ลงผลงาน → ② รายละเอียด → ③ ภาพผลงาน → ④ ยืนยันตัวเลข; `step` is the current one. */
export function WizardStepper({ step }: { step: 1 | 2 | 3 | 4 }) {
  const t = useTranslations("Wizard");
  const steps = [
    { label: t("stepBasics"), hint: t("stepBasicsHint") },
    { label: t("stepDetails"), hint: t("stepDetailsHint") },
    { label: t("stepMedia"), hint: t("stepMediaHint") },
    { label: t("stepVerify"), hint: t("stepVerifyHint") },
  ];
  return (
    <ol aria-label={t("stepsLabel")} className="flex items-start">
      {steps.map(({ label, hint }, i) => {
        const n = i + 1;
        const done = n < step;
        const current = n === step;
        return (
          <li
            key={label}
            aria-current={current ? "step" : undefined}
            className="relative flex min-w-0 flex-1 flex-col items-center text-center"
          >
            {/* The line into this step from the previous one; filled once that step is done. */}
            {i > 0 && (
              <span
                aria-hidden="true"
                className={cn(
                  "absolute top-4 right-1/2 -z-0 h-0.5 w-full -translate-y-1/2 transition-colors duration-(--motion-fast)",
                  n <= step ? "bg-brand" : "bg-border",
                )}
              />
            )}
            <span
              className={cn(
                "relative z-10 flex size-8 items-center justify-center rounded-full text-xs font-bold tabular-nums transition-colors duration-(--motion-fast)",
                // Opaque at every state, so the connecting line never shows through (v3.2).
                current &&
                  "border-2 border-brand bg-card text-brand-text ring-4 ring-brand/15",
                done && "bg-brand text-brand-foreground",
                !current && !done && "border bg-card text-muted-foreground",
              )}
            >
              {done ? (
                <>
                  <CheckIcon className="size-4" aria-hidden="true" />
                  <span className="sr-only">{t("stepDone")}</span>
                </>
              ) : (
                n
              )}
            </span>
            <span
              className={cn(
                "mt-2 px-1 text-caption font-semibold",
                current || done ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {label}
            </span>
            <span className="hidden px-1 text-2xs text-faint sm:block">
              {hint}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * One part of step 1: an icon tile, a title and one line of what to do. The tile turns into a
 * green check once `done` (v3.1: icons instead of numbers and paragraphs).
 */
export function WizardSection({
  icon: Icon,
  title,
  hint,
  done,
  children,
}: {
  icon: LucideIcon;
  title: string;
  hint: string;
  done: boolean;
  children: React.ReactNode;
}) {
  const t = useTranslations("Wizard");
  return (
    <Card
      className={cn(
        "space-y-4 p-4 transition-colors duration-(--motion-fast) sm:p-5",
        done && "border-positive/30",
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-xl transition-colors duration-(--motion-fast)",
            done
              ? "bg-positive/10 text-positive"
              : "bg-brand/10 text-brand-text",
          )}
        >
          {done ? (
            <CircleCheckIcon
              className="size-5"
              aria-label={t("sections.complete")}
            />
          ) : (
            <Icon className="size-4.5" aria-hidden="true" />
          )}
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">{title}</h2>
          <p className="text-caption text-muted-foreground">{hint}</p>
        </div>
      </div>
      {children}
    </Card>
  );
}

/** "พร้อมแล้ว 2 จาก 3 ส่วน" with a thin brand bar. */
export function WizardProgress({
  done,
  total,
}: {
  done: number;
  total: number;
}) {
  const t = useTranslations("Wizard");
  return (
    <div className="space-y-1.5">
      <p className="text-caption text-muted-foreground tabular-nums">
        {t("progress", { done, total })}
      </p>
      <div
        aria-hidden="true"
        className="h-1.5 overflow-hidden rounded-full bg-secondary"
      >
        <div
          className="h-full rounded-full bg-brand transition-[width] duration-(--motion-fast)"
          style={{ width: `${(done / total) * 100}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Part 4 "ใครเห็นชื่อผลงาน?" (v3.1): two choice cards instead of the anonymous checkbox, each
 * with a tiny picture of what others will see. Locked once the project exists (as before).
 */
export function VisibilityChoice({
  anonymous,
  onChange,
  disabled,
  name,
}: {
  anonymous: boolean;
  onChange: (anonymous: boolean) => void;
  disabled: boolean;
  /** The typed name, shown in the "public" picture. */
  name: string;
}) {
  const t = useTranslations("Wizard");
  const options = [
    {
      value: false,
      icon: EyeIcon,
      title: t("visibility.public"),
      hint: t("visibility.publicHint"),
      picture: (
        <span className="flex items-center gap-1.5">
          <span className="size-4 rounded bg-brand/60" />
          <span className="max-w-24 truncate text-2xs font-semibold">
            {name || t("previewPlaceholder")}
          </span>
        </span>
      ),
    },
    {
      value: true,
      icon: EyeOffIcon,
      title: t("visibility.anonymous"),
      hint: t("visibility.anonymousHint"),
      picture: (
        <span className="flex items-center gap-1.5">
          <span className="size-4 rounded bg-muted-foreground/30" />
          <span className="h-2 w-16 rounded-full bg-muted-foreground/40 blur-[2px]" />
        </span>
      ),
    },
  ];
  return (
    <div role="radiogroup" className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((o) => {
          const chosen = anonymous === o.value;
          return (
            <label
              key={String(o.value)}
              className={cn(
                "flex cursor-pointer flex-col gap-2 rounded-xl border p-3 transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                chosen ? "border-brand bg-brand/5" : "bg-card hover:bg-accent",
                disabled && "cursor-not-allowed opacity-60",
              )}
            >
              <input
                type="radio"
                name="visibility"
                checked={chosen}
                disabled={disabled}
                onChange={() => onChange(o.value)}
                className="sr-only"
              />
              <span className="flex items-center gap-2">
                <o.icon
                  className={cn(
                    "size-4 shrink-0",
                    chosen ? "text-brand-text" : "text-muted-foreground",
                  )}
                  aria-hidden="true"
                />
                <span className="text-sm font-semibold">{o.title}</span>
                {!o.value && (
                  <span className="rounded-full bg-positive/10 px-2 py-0.5 text-2xs font-semibold text-positive">
                    {t("visibility.recommended")}
                  </span>
                )}
              </span>
              <span className="text-caption text-muted-foreground">
                {o.hint}
              </span>
              {/* What others will see. */}
              <span
                aria-hidden="true"
                className="w-fit rounded-md border bg-background px-2 py-1.5"
              >
                {o.picture}
              </span>
            </label>
          );
        })}
      </div>
      {disabled && (
        <p className="text-caption text-faint">{t("visibility.locked")}</p>
      )}
    </div>
  );
}

/** v3.1: the intro as four icon chips instead of two paragraphs. */
export function WizardIntro() {
  const t = useTranslations("Wizard");
  const chips = [
    [SparklesIcon, t("intro.autofill")],
    [PencilLineIcon, t("intro.ai")],
    [GlobeIcon, t("intro.live")],
    [BadgeCheckIcon, t("intro.verified")],
  ] as const;
  return (
    <ul className="flex flex-wrap gap-2">
      {chips.map(([Icon, text]) => (
        <li
          key={text}
          className="inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-caption text-muted-foreground"
        >
          <Icon
            className="size-3.5 shrink-0 text-brand-text"
            aria-hidden="true"
          />
          {text}
        </li>
      ))}
    </ul>
  );
}
