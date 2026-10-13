"use client";

import { CheckIcon, CircleCheckIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/core/Card";
import { cn } from "@/lib/utils";

// Design.md §5 Add-startup wizard v3 (owner 2026-10-13: "plain text … no interactive experience"):
// a three-step stepper and the numbered section cards of step 1.

/** ① ลงผลงาน → ② ยืนยันตัวเลข → ③ เปิดหน้าผลงาน; `step` is the current one (1 or 2). */
export function WizardStepper({ step }: { step: 1 | 2 }) {
  const t = useTranslations("Wizard");
  const steps = [
    { label: t("stepBasics"), hint: t("stepBasicsHint") },
    { label: t("stepRevenue"), hint: t("stepRevenueHint") },
    { label: t("stepProfile"), hint: t("stepProfileHint") },
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
                current &&
                  "bg-brand text-brand-foreground ring-4 ring-brand/15",
                done && "bg-brand/10 text-brand-text ring-1 ring-brand/30",
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

/** One numbered part of step 1; the number turns into a green check once `done`. */
export function WizardSection({
  n,
  title,
  hint,
  done,
  children,
}: {
  n: number;
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
      <div className="flex items-start gap-3">
        {done ? (
          <CircleCheckIcon
            className="size-6 shrink-0 text-positive"
            aria-label={t("sections.complete")}
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex size-6 shrink-0 items-center justify-center rounded-full border text-caption font-bold text-muted-foreground tabular-nums"
          >
            {n}
          </span>
        )}
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
