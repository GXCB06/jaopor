"use client";

import { ArrowLeftIcon, ArrowRightIcon, Loader2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { saveProfile, saveSkills } from "@/app/actions/profile";
import { Card } from "@/components/core/Card";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/wizard/fields";
import { useRouter } from "next/navigation";
import { PROFILE_STATUSES } from "@/lib/profile";
import { cn } from "@/lib/utils";
import { HandleField, type HandleState } from "./HandleField";
import { ProvinceField } from "./ProvinceField";
import { SkillPicker, type PickedSkill } from "./SkillPicker";

const STEPS = ["handle", "about", "status", "skills"] as const;

/**
 * Design.md §6 Onboarding (spec 9e): username (live check) → headline + province → status →
 * skills (skippable), then `done`: the page they signed in from, else the dashboard (has a startup)
 * or the startups list (Design.md §6 Sign-in routing).
 */
export function OnboardingFlow({
  suggestedHandle,
  name,
  done,
}: {
  suggestedHandle: string;
  name: string;
  /** Full path including the locale. */
  done: string;
}) {
  const t = useTranslations("Me");
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [handle, setHandle] = useState(suggestedHandle);
  const [handleState, setHandleState] = useState<HandleState>("idle");
  const [headline, setHeadline] = useState("");
  const [province, setProvince] = useState("");
  const [status, setStatus] = useState("networking");
  const [skills, setSkills] = useState<PickedSkill[]>([]);
  const [saving, start] = useTransition();
  const current = STEPS[step];

  const finish = (withSkills: boolean) =>
    start(async () => {
      const res = await saveProfile({
        handle,
        headline,
        province: province || null,
        status,
      });
      if (!res.ok) {
        toast.error(
          t.has(`errors.${res.error}`)
            ? t(`errors.${res.error}`)
            : t("saveFailed"),
        );
        if (res.error.startsWith("handle")) setStep(0);
        return;
      }
      if (withSkills && skills.length) {
        const s = await saveSkills(skills);
        if (!s.ok) toast.error(t("saveFailed"));
      }
      router.replace(done);
    });

  const canNext = current !== "handle" || handleState === "ok";

  return (
    <Card className="space-y-6 p-6">
      <div className="space-y-3">
        <p className="text-2xs font-semibold tracking-wider text-faint uppercase">
          {t("onb.step", { n: step + 1, of: STEPS.length })}
        </p>
        <div className="flex gap-1.5" aria-hidden="true">
          {STEPS.map((s, i) => (
            <span
              key={s}
              className={cn(
                "h-1 flex-1 rounded-full",
                i <= step ? "bg-brand" : "bg-secondary",
              )}
            />
          ))}
        </div>
        <h1 className="text-xl font-bold tracking-tight">
          {step === 0 ? t("onb.welcome", { name }) : t(`onb.${current}Title`)}
        </h1>
        <p className="text-caption text-muted-foreground">
          {t(`onb.${current}Hint`)}
        </p>
      </div>

      {current === "handle" && (
        <Field label={t("f.handle")} htmlFor="onb-handle">
          <HandleField
            id="onb-handle"
            value={handle}
            onChange={setHandle}
            onState={setHandleState}
          />
        </Field>
      )}
      {current === "about" && (
        <div className="space-y-4">
          <Field
            label={t("f.headline")}
            htmlFor="onb-headline"
            hint={`${headline.length}/80`}
          >
            <input
              id="onb-headline"
              value={headline}
              maxLength={80}
              placeholder={t("f.headlinePh")}
              onChange={(e) => setHeadline(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label={t("f.province")} htmlFor="onb-province">
            <ProvinceField
              id="onb-province"
              value={province}
              onChange={setProvince}
              suggest
            />
          </Field>
        </div>
      )}
      {current === "status" && (
        <div
          role="radiogroup"
          aria-label={t("f.status")}
          className="grid gap-2"
        >
          {PROFILE_STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={status === s}
              onClick={() => setStatus(s)}
              className={cn(
                "rounded-lg border px-4 py-3 text-left text-sm transition-colors",
                status === s
                  ? "border-brand bg-brand/10 font-semibold"
                  : "hover:bg-accent",
              )}
            >
              {t(`status.${s}`)}
            </button>
          ))}
        </div>
      )}
      {current === "skills" && (
        <SkillPicker value={skills} onChange={setSkills} />
      )}

      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() => setStep(step - 1)}
          disabled={step === 0 || saving}
        >
          <ArrowLeftIcon aria-hidden="true" />
          {t("back")}
        </Button>
        <div className="flex gap-2">
          {current === "skills" && (
            <Button
              type="button"
              variant="outline"
              onClick={() => finish(false)}
              disabled={saving}
            >
              {t("onb.skip")}
            </Button>
          )}
          {current === "skills" ? (
            <Button
              type="button"
              onClick={() => finish(true)}
              disabled={saving}
            >
              {saving && (
                <Loader2Icon className="animate-spin" aria-hidden="true" />
              )}
              {t("onb.finish")}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => setStep(step + 1)}
              disabled={!canNext}
            >
              {t("next")}
              <ArrowRightIcon aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
