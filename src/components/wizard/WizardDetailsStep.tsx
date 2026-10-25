"use client";

import { Loader2Icon, SparklesIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { AutofillDraft } from "@/lib/autofill";
import {
  AI_TOOLS,
  AUDIENCES,
  FUNDING,
  TEAM_SIZES,
  type AiTool,
} from "@/lib/catalog";
import { toTechStack } from "@/lib/config/display";
import { aiToolLabel } from "@/lib/config/stack";
import {
  PRICING_CURRENCIES,
  PRICING_PERIODS,
  type PricingPeriod,
} from "@/lib/pricing";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  missingDetails,
  type MissingDetail,
  type WizardDetails,
} from "@/lib/wizard-details";
import { Field, Select, ToggleChips, inputClass } from "./fields";
import { VocabCombobox } from "./VocabCombobox";
import {
  stackOptions,
  stackToValues,
  toCustomStack,
  valuesToStack,
} from "./vocab-options";
import { WizardSection } from "./WizardParts";

// Design.md §5 Add-startup wizard v4, step 2 "รายละเอียด": AI (Gemini, /api/startups/{id}/autofill)
// drafts every empty field from the project's website once, then the founder checks and fixes it.
// Required: description, value proposition, problem solved, audience, pricing, AI tools, tech stack,
// founded month. Team size and funding stay optional and unlabelled (no "skip" wording).
// Saved in the same shape as the edit page (StartupEditForm.save).

type Details = WizardDetails;

const EMPTY: Details = {
  description: "",
  valueProposition: "",
  problemSolved: "",
  audience: "",
  pricingPeriod: "",
  pricingAmount: "",
  pricingCurrency: "THB",
  pricingNote: "",
  aiTools: [],
  techStack: [],
  founded: "",
  teamSize: "",
  funding: "",
};

const COLUMNS =
  "description, value_proposition, problem_solved, audience, pricing_period, pricing_amount, pricing_currency, pricing_note, ai_tools, tech_stack, founded_on, team_size, funding";

export function WizardDetailsStep({
  startupId,
  hasWebsite,
  onSaved,
}: {
  startupId: number;
  /** Autofill reads the project's own website; without one, the founder types it in. */
  hasWebsite: boolean;
  onSaved: () => void;
}) {
  const t = useTranslations("Wizard");
  const cat = useTranslations("Catalog");
  const pr = useTranslations("Pricing");
  const common = useTranslations("Common");
  const locale = useLocale();
  const [d, setD] = useState<Details>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [ai, setAi] = useState<
    | { state: "reading" }
    | { state: "done"; n: number }
    | { state: "nothing" }
    | null
  >(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tried, setTried] = useState(false);
  // The latest values, for the async autofill (it fills only fields still empty when it returns).
  const latest = useRef<Details>(EMPTY);
  useEffect(() => {
    latest.current = d;
  }, [d]);

  const set =
    <K extends keyof Details>(k: K) =>
    (v: Details[K]) =>
      setD((cur) => ({ ...cur, [k]: v }));

  // The draft's saved values (a resumed draft keeps what was entered before).
  useEffect(() => {
    let live = true;
    void createClient()
      .from("startups")
      .select(COLUMNS)
      .eq("id", startupId)
      .maybeSingle()
      .then(({ data }) => {
        if (!live) return;
        const saved: Details = data
          ? {
              description: data.description ?? "",
              valueProposition: data.value_proposition ?? "",
              problemSolved: data.problem_solved ?? "",
              audience: data.audience ?? "",
              pricingPeriod: (data.pricing_period ?? "") as PricingPeriod | "",
              pricingAmount:
                data.pricing_amount != null ? String(data.pricing_amount) : "",
              pricingCurrency:
                (data.pricing_currency as Details["pricingCurrency"]) ?? "THB",
              pricingNote: data.pricing_note ?? "",
              aiTools: (data.ai_tools ?? []) as AiTool[],
              techStack: stackToValues(toTechStack(data.tech_stack)),
              founded: data.founded_on?.slice(0, 7) ?? "",
              teamSize: data.team_size ?? "",
              funding: data.funding ?? "",
            }
          : EMPTY;
        latest.current = saved;
        setD(saved);
        setLoaded(true);
        // Once, right after loading: let AI fill whatever is still empty.
        if (hasWebsite && missingDetails(saved).length > 0) void autofill();
      });
    return () => {
      live = false;
    };
    // autofill is stable for this step (startupId + locale); run once per draft.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startupId]);

  async function autofill() {
    setAi({ state: "reading" });
    try {
      const res = await fetch(`/api/startups/${startupId}/autofill`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ locale }),
      });
      const body = (await res.json().catch(() => ({}))) as
        { draft: AutofillDraft } | { error?: string };
      if (!res.ok || !("draft" in body)) return setAi({ state: "nothing" });
      const x = body.draft;
      let n = 0;
      const next = { ...latest.current };
      {
        const fill = <K extends keyof Details>(
          k: K,
          v: Details[K] | undefined,
        ) => {
          const c = next[k];
          const empty = Array.isArray(c) ? c.length === 0 : !c;
          if (v !== undefined && (Array.isArray(v) ? v.length : v) && empty) {
            next[k] = v;
            n++;
          }
        };
        fill("description", x.description);
        fill("valueProposition", x.valueProposition);
        fill("problemSolved", x.problemSolved);
        fill("audience", x.audience);
        fill("techStack", x.techStack);
        fill("aiTools", x.aiTools);
        fill("founded", x.founded);
        fill("pricingNote", x.pricingNote);
        if (!next.pricingPeriod && x.pricingPeriod) {
          next.pricingPeriod = x.pricingPeriod;
          if (x.pricingAmount != null)
            next.pricingAmount = String(x.pricingAmount);
          if (x.pricingCurrency) next.pricingCurrency = x.pricingCurrency;
          n++;
        }
      }
      latest.current = next;
      setD(next);
      setAi(n > 0 ? { state: "done", n } : { state: "nothing" });
    } catch {
      setAi({ state: "nothing" });
    }
  }

  const missing = missingDetails(d);
  const label = (k: MissingDetail) => (k === "pricing" ? t("pricing") : t(k));

  async function save() {
    setTried(true);
    setError(null);
    if (missing.length) return;
    const period = d.pricingPeriod || null;
    const priced = period !== null && period !== "free";
    setBusy(true);
    const { error: dbErr } = await createClient()
      .from("startups")
      .update({
        description: d.description.trim(),
        value_proposition: d.valueProposition.trim(),
        problem_solved: d.problemSolved.trim(),
        audience: d.audience,
        pricing_period: period,
        pricing_amount: priced ? Number(d.pricingAmount) : null,
        pricing_currency: priced ? d.pricingCurrency : null,
        pricing_note: d.pricingNote.trim() || null,
        ai_tools: d.aiTools,
        tech_stack: valuesToStack(d.techStack),
        founded_on: `${d.founded}-01`,
        team_size: d.teamSize || null,
        funding: d.funding || null,
      })
      .eq("id", startupId);
    setBusy(false);
    if (dbErr) return setError(common("genericError"));
    onSaved();
  }

  const invalid = (k: MissingDetail) => tried && missing.includes(k);
  const comboLabels = {
    remove: (l: string) => t("removeItem", { label: l }),
    noMatch: t("noMatch"),
  };

  return (
    <div className="space-y-4">
      <WizardSection
        icon={SparklesIcon}
        title={t("details.title")}
        hint={t("details.hint")}
        done={loaded && missing.length === 0}
      >
        {/* The AI status, and a way to run it again (it only fills empty fields). */}
        <div
          role="status"
          className={cn(
            "flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-caption",
            ai?.state === "done"
              ? "border-brand/40 bg-brand/5 text-brand-text"
              : "text-muted-foreground",
          )}
        >
          <span className="flex items-center gap-2">
            {ai?.state === "reading" ? (
              <Loader2Icon
                className="size-3.5 animate-spin"
                aria-hidden="true"
              />
            ) : (
              <SparklesIcon className="size-3.5" aria-hidden="true" />
            )}
            {!hasWebsite
              ? t("details.noWebsite")
              : ai?.state === "reading"
                ? t("details.aiReading")
                : ai?.state === "done"
                  ? t("details.aiDone", { n: ai.n })
                  : ai?.state === "nothing"
                    ? t("details.aiNothing")
                    : t("details.aiIdle")}
          </span>
          {hasWebsite && ai?.state !== "reading" && (
            <button
              type="button"
              onClick={() => void autofill()}
              className="font-semibold text-brand-text hover:underline"
            >
              {t("details.aiRetry")}
            </button>
          )}
        </div>

        <div
          className={cn("grid gap-4 sm:grid-cols-2", !loaded && "opacity-60")}
        >
          <Field
            id="description"
            label={t("description")}
            htmlFor="details-description"
            className="sm:col-span-2"
          >
            <Textarea
              id="details-description"
              rows={4}
              maxLength={2000}
              value={d.description}
              onChange={(e) => set("description")(e.target.value)}
              aria-invalid={invalid("description")}
            />
          </Field>
          <Field
            label={t("valueProposition")}
            htmlFor="details-value"
            className="sm:col-span-2"
          >
            <input
              id="details-value"
              maxLength={300}
              value={d.valueProposition}
              onChange={(e) => set("valueProposition")(e.target.value)}
              aria-invalid={invalid("valueProposition")}
              className={inputClass}
            />
          </Field>
          <Field
            label={t("problemSolved")}
            htmlFor="details-problem"
            className="sm:col-span-2"
          >
            <input
              id="details-problem"
              maxLength={300}
              value={d.problemSolved}
              onChange={(e) => set("problemSolved")(e.target.value)}
              aria-invalid={invalid("problemSolved")}
              className={inputClass}
            />
          </Field>
          <Field label={t("audience")} htmlFor="details-audience">
            <Select
              id="details-audience"
              value={d.audience}
              onChange={set("audience")}
              placeholder={t("choose")}
              options={AUDIENCES.map((a) => ({
                value: a,
                label: cat(`audience.${a}`),
              }))}
            />
          </Field>
          <Field label={t("founded")} htmlFor="details-founded">
            <input
              id="details-founded"
              type="month"
              value={d.founded}
              onChange={(e) => set("founded")(e.target.value)}
              aria-invalid={invalid("founded")}
              className={inputClass}
            />
          </Field>
          <fieldset className="grid gap-3 sm:col-span-2 sm:grid-cols-3">
            <legend className="mb-2 text-xs font-medium">{t("pricing")}</legend>
            <Field label={t("pricingPeriod")} htmlFor="details-period">
              <Select
                id="details-period"
                value={d.pricingPeriod}
                onChange={(v) => set("pricingPeriod")(v as PricingPeriod | "")}
                placeholder={t("choose")}
                options={PRICING_PERIODS.map((x) => ({
                  value: x,
                  label: pr(x),
                }))}
              />
            </Field>
            {d.pricingPeriod && d.pricingPeriod !== "free" && (
              <>
                <Field label={t("pricingAmount")} htmlFor="details-amount">
                  <input
                    id="details-amount"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.01"
                    value={d.pricingAmount}
                    onChange={(e) => set("pricingAmount")(e.target.value)}
                    aria-invalid={invalid("pricing")}
                    className={cn(inputClass, "tabular-nums")}
                  />
                </Field>
                <Field label={t("pricingCurrency")} htmlFor="details-currency">
                  <Select
                    id="details-currency"
                    value={d.pricingCurrency}
                    onChange={(v) =>
                      set("pricingCurrency")(v as Details["pricingCurrency"])
                    }
                    options={PRICING_CURRENCIES.map((c) => ({
                      value: c,
                      label: c === "THB" ? "฿ THB" : "$ USD",
                    }))}
                  />
                </Field>
              </>
            )}
            <Field
              label={t("pricingNote")}
              htmlFor="details-pricing-note"
              hint={t("pricingNoteHint")}
              className="sm:col-span-3"
            >
              <input
                id="details-pricing-note"
                maxLength={300}
                value={d.pricingNote}
                onChange={(e) => set("pricingNote")(e.target.value)}
                className={inputClass}
              />
            </Field>
          </fieldset>
          <Field label={t("aiTools")} className="sm:col-span-2">
            <ToggleChips
              options={AI_TOOLS.map((x) => ({
                value: x,
                label: aiToolLabel(x, locale),
              }))}
              value={d.aiTools}
              onChange={set("aiTools")}
            />
          </Field>
          <Field
            label={t("techStack")}
            htmlFor="details-stack"
            className="sm:col-span-2"
          >
            <VocabCombobox
              id="details-stack"
              options={stackOptions(locale)}
              value={d.techStack}
              onChange={set("techStack")}
              max={24}
              placeholder={t("stackPlaceholder")}
              toCustom={toCustomStack}
              customLabel={(text) => t("addCustom", { text })}
              describeCustom={(v) => v.slice("custom:".length)}
              labels={comboLabels}
            />
          </Field>
          <Field label={t("teamSize")} htmlFor="details-team">
            <Select
              id="details-team"
              value={d.teamSize}
              onChange={set("teamSize")}
              placeholder={t("choose")}
              options={TEAM_SIZES.map((x) => ({
                value: x,
                label: cat(`team.${x}`),
              }))}
            />
          </Field>
          <Field label={t("funding")} htmlFor="details-funding">
            <Select
              id="details-funding"
              value={d.funding}
              onChange={set("funding")}
              placeholder={t("choose")}
              options={FUNDING.map((x) => ({
                value: x,
                label: cat(`funding.${x}`),
              }))}
            />
          </Field>
        </div>
      </WizardSection>

      <div className="space-y-2">
        {missing.length > 0 && (
          <p
            role={tried ? "alert" : undefined}
            className={cn(
              "text-caption",
              tried ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {t("missing", { items: missing.map(label).join(", ") })}
          </p>
        )}
        {error && (
          <p role="alert" className="text-caption text-destructive">
            {error}
          </p>
        )}
        <Button
          type="button"
          onClick={() => void save()}
          disabled={busy || !loaded || ai?.state === "reading"}
          className="px-4 max-sm:w-full"
        >
          {busy && <Loader2Icon className="animate-spin" aria-hidden="true" />}
          {t("saveAndContinue")}
        </Button>
      </div>
    </div>
  );
}
