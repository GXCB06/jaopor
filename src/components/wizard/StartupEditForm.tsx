"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { revalidateStartup } from "@/app/actions/revalidate";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Link, useRouter } from "@/i18n/navigation";
import {
  AI_TOOLS,
  AUDIENCES,
  FUNDING,
  TEAM_SIZES,
  type AiTool,
} from "@/lib/catalog";
import { CATEGORY_LIST } from "@/lib/config/categories";
import { MAX_CHANNELS } from "@/lib/config/channels";
import { channelLabel, toTechStack } from "@/lib/config/display";
import { localizedName } from "@/lib/config/localized";
import { aiToolLabel } from "@/lib/config/stack";
import { videoEmbed, type Screenshot } from "@/lib/media";
import {
  PRICING_CURRENCIES,
  PRICING_PERIODS,
  type PricingPeriod,
} from "@/lib/pricing";
import type { Tables } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/client";
import {
  LINK_COLUMN,
  LINK_KINDS,
  LOOKING_FOR,
  parseProjectLink,
  websiteHost,
  type LinkKind,
  type LookingFor,
} from "@/lib/links";
import { useSessionDraft } from "@/lib/use-session-draft";
import { cn } from "@/lib/utils";
import { Field, Select, ToggleChips, inputClass } from "./fields";
import { uploadLogo } from "./StartupWizard";
import { ScreenshotsManager } from "./ScreenshotsManager";
import {
  channelOptions,
  provinceOptions,
  stackOptions,
  stackToValues,
  suggestedStackValues,
  toCustomChannel,
  toCustomStack,
  valuesToStack,
} from "./vocab-options";
import { VerifyPanel, type ConnectionInfo } from "./VerifyPanel";
import { VocabCombobox } from "./VocabCombobox";

// One page with every field. Each field wrapper has id="<field>" so the profile's "+ Add"
// cards can deep-link (/dashboard/[id]/edit#pricing) and the field gets highlighted.

const COUNTRIES = [
  "TH",
  "SG",
  "MY",
  "ID",
  "VN",
  "PH",
  "JP",
  "KR",
  "IN",
  "CN",
  "TW",
  "HK",
  "AU",
  "US",
  "GB",
  "DE",
  "FR",
  "CA",
];
const MAX_LOGO_BYTES = 1024 * 1024;
const LINK_PLACEHOLDER: Record<LinkKind, string> = {
  website: "yourapp.com",
  app_store: "https://apps.apple.com/th/app/…",
  play_store: "https://play.google.com/store/apps/details?id=…",
  line: "@yourbot",
  github: "https://github.com/you/app",
};

export function StartupEditForm({
  userId,
  startup,
  connections,
  githubLogin,
  screenshots,
}: {
  userId: string;
  startup: Tables<"startups">;
  connections: ConnectionInfo[];
  githubLogin: string | null;
  screenshots: Screenshot[];
}) {
  const t = useTranslations("Wizard");
  const p = useTranslations("Profile");
  const lt = useTranslations("Links");
  const lf = useTranslations("LookingFor");
  const st = useTranslations("Sources");
  const common = useTranslations("Common");
  const cat = useTranslations("Catalog");
  const pr = useTranslations("Pricing");
  const comboLabels = {
    remove: (label: string) => t("removeItem", { label }),
    noMatch: t("noMatch"),
  };
  const locale = useLocale();
  const router = useRouter();
  const region = useMemo(
    () => new Intl.DisplayNames([locale], { type: "region" }),
    [locale],
  );

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState({
    name: startup.name,
    links: Object.fromEntries(
      LINK_KINDS.map((k) => [k, startup[LINK_COLUMN[k]] ?? ""]),
    ) as Record<LinkKind, string>,
    lookingFor: startup.looking_for as LookingFor[],
    buildStory: startup.build_story ?? "",
    tagline: startup.tagline ?? "",
    description: startup.description ?? "",
    category: startup.category,
    country: startup.country,
    province: startup.province ?? "",
    founded: startup.founded_on?.slice(0, 7) ?? "",
    aiTools: startup.ai_tools as AiTool[],
    valueProposition: startup.value_proposition ?? "",
    problemSolved: startup.problem_solved ?? "",
    audience: startup.audience ?? "",
    pricingAmount:
      startup.pricing_amount !== null ? String(startup.pricing_amount) : "",
    pricingCurrency: startup.pricing_currency ?? "THB",
    pricingPeriod: (startup.pricing_period ?? "") as PricingPeriod | "",
    pricingNote: startup.pricing_note ?? "",
    teamSize: startup.team_size ?? "",
    funding: startup.funding ?? "",
    techStack: stackToValues(toTechStack(startup.tech_stack)),
    channels: startup.marketing_channels,
    demoVideo: startup.demo_video_url ?? "",
    founderRole: startup.founder_role ?? "",
    founderMessage: startup.founder_message ?? "",
  });
  const [logo, setLogo] = useState<File | null>(null);
  // A language switch remounts the page: keep unsaved edits for this tab. The key includes
  // updated_at, so a draft never overrides newer saved data.
  const [restored, setRestored] = useState(false);
  const clearDraft = useSessionDraft(
    `jaopor:draft:startup:${startup.id}:${startup.updated_at}`,
    f,
    (draft) => {
      setF(draft);
      setRestored(true);
    },
  );
  const set =
    <K extends keyof typeof f>(k: K) =>
    (v: (typeof f)[K]) =>
      setF((s) => ({ ...s, [k]: v }));

  // Scroll to + highlight the field named in the URL hash (from the profile's "+ Add").
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    const el = id ? document.getElementById(id) : null;
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("ring-2", "ring-brand/60", "rounded-md");
    el.querySelector<HTMLElement>("input, textarea, select")?.focus({
      preventScroll: true,
    });
    const timer = setTimeout(
      () => el.classList.remove("ring-2", "ring-brand/60"),
      2500,
    );
    return () => clearTimeout(timer);
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (logo && logo.size > MAX_LOGO_BYTES) return setError(t("logoTooBig"));
    // Each link box only accepts its own kind (a Play link in the LINE box is an error).
    const links: Record<string, string | null> = {};
    for (const kind of LINK_KINDS) {
      const raw = f.links[kind].trim();
      const parsed = raw ? parseProjectLink(raw) : null;
      if (raw && parsed?.kind !== kind) return setError(lt("invalid"));
      links[LINK_COLUMN[kind]] = parsed?.url ?? null;
    }
    if (Object.values(links).every((v) => !v)) return setError(lt("needOne"));
    const amount = f.pricingAmount.trim() ? Number(f.pricingAmount) : null;
    const period = f.pricingPeriod || null;
    const priced = period !== null && period !== "free";
    if (priced && (amount === null || !Number.isFinite(amount) || amount < 0))
      return setError(t("pricingAmount"));
    const demoVideo = f.demoVideo.trim();
    if (demoVideo && !videoEmbed(demoVideo))
      return setError(t("demoVideoInvalid"));
    setBusy(true);
    try {
      const logoPath = logo
        ? await uploadLogo(userId, logo)
        : startup.logo_path;
      const { error: dbErr } = await createClient()
        .from("startups")
        .update({
          name: f.name.trim(),
          ...links,
          looking_for: f.lookingFor,
          build_story: f.buildStory.trim() || null,
          tagline: f.tagline.trim() || null,
          description: f.description.trim() || null,
          category: f.category,
          country: f.country,
          province: f.country === "TH" ? f.province || null : null,
          founded_on: f.founded ? `${f.founded}-01` : null,
          ai_tools: f.aiTools,
          logo_path: logoPath,
          value_proposition: f.valueProposition.trim() || null,
          problem_solved: f.problemSolved.trim() || null,
          audience: f.audience || null,
          pricing_amount: priced ? amount : null,
          pricing_currency: priced ? f.pricingCurrency : null,
          pricing_period: period,
          pricing_note: f.pricingNote.trim() || null,
          team_size: f.teamSize || null,
          funding: f.funding || null,
          tech_stack: valuesToStack(f.techStack),
          marketing_channels: f.channels.slice(0, MAX_CHANNELS),
          demo_video_url: demoVideo || null,
          founder_role: f.founderRole.trim() || null,
          founder_message: f.founderMessage.trim() || null,
        })
        .eq("id", startup.id);
      if (dbErr) throw dbErr;
      await revalidateStartup(startup.id);
      clearDraft();
      toast.success(common("save") + " ✓");
      router.push(`/startup/${startup.slug}`);
      router.refresh();
    } catch {
      setError(common("genericError"));
    } finally {
      setBusy(false);
    }
  }

  // GitHub build proof already detects the stack (startups.build_stack): offer it in one click.
  const stackSuggestion = suggestedStackValues(
    startup.build_stack,
    f.techStack,
  );

  const text = (
    key: keyof typeof f,
    id: string,
    label: string,
    max: number,
    wide = false,
    placeholder?: string,
  ) => (
    <Field
      id={id}
      label={label}
      htmlFor={`${id}-input`}
      optional={common("optional")}
      className={cn(wide && "sm:col-span-2")}
    >
      <input
        id={`${id}-input`}
        maxLength={max}
        placeholder={placeholder}
        value={f[key] as string}
        onChange={(e) => set(key)(e.target.value as never)}
        className={inputClass}
      />
    </Field>
  );

  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">{st("title")}</h2>
        <VerifyPanel
          startupId={startup.id}
          slug={startup.slug}
          connections={connections}
          websiteHost={websiteHost(startup.website_url)}
          githubLogin={githubLogin}
        />
      </section>

      <section id="screenshots" className="scroll-mt-24 space-y-3">
        <h2 className="text-sm font-semibold">{t("screenshots")}</h2>
        <ScreenshotsManager startupId={startup.id} initial={screenshots} />
      </section>

      {restored && (
        <p
          role="status"
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-brand/40 bg-brand/5 px-3 py-2 text-caption"
        >
          {t("draftRestored")}
          <button
            type="button"
            onClick={() => {
              clearDraft();
              window.location.reload();
            }}
            className="text-brand-text hover:underline"
          >
            {t("draftDiscard")}
          </button>
        </p>
      )}

      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <h2 className="text-sm font-semibold sm:col-span-2">
          {t("stepBasics")}
        </h2>
        <Field id="name" label={t("name")} htmlFor="name-input">
          <input
            id="name-input"
            required
            maxLength={80}
            value={f.name}
            onChange={(e) => set("name")(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field
          id="looking_for"
          label={t("lookingFor")}
          optional={common("optional")}
        >
          <ToggleChips
            options={LOOKING_FOR.map((x) => ({ value: x, label: lf(x) }))}
            value={f.lookingFor}
            onChange={set("lookingFor")}
          />
        </Field>
        <fieldset
          id="links"
          className="grid scroll-mt-24 gap-4 sm:col-span-2 sm:grid-cols-2"
        >
          <legend className="mb-2 text-xs font-medium">{t("links")}</legend>
          {LINK_KINDS.map((kind) => (
            <Field
              key={kind}
              id={LINK_COLUMN[kind]}
              label={lt(kind)}
              htmlFor={`${kind}-input`}
              optional={common("optional")}
            >
              <input
                id={`${kind}-input`}
                inputMode="url"
                maxLength={300}
                placeholder={LINK_PLACEHOLDER[kind]}
                value={f.links[kind]}
                onChange={(e) =>
                  set("links")({ ...f.links, [kind]: e.target.value })
                }
                className={inputClass}
              />
            </Field>
          ))}
        </fieldset>
        {text("tagline", "tagline", t("tagline"), 140, true)}
        <Field
          id="description"
          label={p("description")}
          htmlFor="description-input"
          optional={common("optional")}
          className="sm:col-span-2"
        >
          <Textarea
            id="description-input"
            maxLength={2000}
            rows={4}
            value={f.description}
            onChange={(e) => set("description")(e.target.value)}
          />
        </Field>
        <Field id="category" label={t("category")} htmlFor="category-input">
          <Select
            id="category-input"
            value={f.category}
            onChange={set("category")}
            options={CATEGORY_LIST.map((c) => ({
              value: c.slug,
              label: localizedName(c, locale),
            }))}
          />
        </Field>
        <Field
          id="founded"
          label={t("founded")}
          htmlFor="founded-input"
          optional={common("optional")}
        >
          <input
            id="founded-input"
            type="month"
            value={f.founded}
            onChange={(e) => set("founded")(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field id="country" label={t("country")} htmlFor="country-input">
          <Select
            id="country-input"
            value={f.country}
            onChange={set("country")}
            options={COUNTRIES.map((c) => ({
              value: c,
              label: region.of(c) ?? c,
            }))}
          />
        </Field>
        {f.country === "TH" && (
          <Field id="province" label={t("province")} htmlFor="province-input">
            <VocabCombobox
              id="province-input"
              multiple={false}
              required
              options={provinceOptions(locale)}
              value={f.province ? [f.province] : []}
              onChange={(v) => set("province")(v[0] ?? "")}
              placeholder={t("provincePlaceholder")}
              labels={comboLabels}
            />
          </Field>
        )}
        <Field id="ai_tools" label={t("aiTools")} className="sm:col-span-2">
          <ToggleChips
            options={AI_TOOLS.map((x) => ({
              value: x,
              label: aiToolLabel(x, locale),
            }))}
            value={f.aiTools}
            onChange={set("aiTools")}
          />
        </Field>
        <Field
          id="logo"
          label={t("logo")}
          htmlFor="logo-input"
          hint={t("logoHint")}
          optional={common("optional")}
          className="sm:col-span-2"
        >
          <input
            id="logo-input"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => setLogo(e.target.files?.[0] ?? null)}
            className="text-xs text-muted-foreground file:mr-3 file:rounded-md file:border file:bg-input/30 file:px-3 file:py-1.5 file:text-xs file:text-foreground"
          />
        </Field>

        <h2 className="mt-4 text-sm font-semibold sm:col-span-2">
          {t("stepInsights")}
        </h2>
        {text(
          "valueProposition",
          "value_proposition",
          t("valueProposition"),
          300,
          true,
        )}
        {text("problemSolved", "problem_solved", t("problemSolved"), 300, true)}
        <Field
          id="audience"
          label={t("audience")}
          htmlFor="audience-input"
          optional={common("optional")}
        >
          <Select
            id="audience-input"
            value={f.audience}
            onChange={set("audience")}
            placeholder={t("choose")}
            options={AUDIENCES.map((a) => ({
              value: a,
              label: cat(`audience.${a}`),
            }))}
          />
        </Field>
        <fieldset
          id="pricing"
          className="grid scroll-mt-24 gap-3 sm:col-span-2 sm:grid-cols-3"
        >
          <legend className="mb-2 text-xs font-medium">
            {t("pricing")}{" "}
            <span className="text-2xs font-normal text-muted-foreground">
              ({common("optional")})
            </span>
          </legend>
          <Field label={t("pricingPeriod")} htmlFor="pricing-period-input">
            <Select
              id="pricing-period-input"
              value={f.pricingPeriod}
              onChange={(v) => set("pricingPeriod")(v as PricingPeriod | "")}
              placeholder={t("choose")}
              options={PRICING_PERIODS.map((x) => ({
                value: x,
                label: pr(x),
              }))}
            />
          </Field>
          {f.pricingPeriod && f.pricingPeriod !== "free" && (
            <>
              <Field label={t("pricingAmount")} htmlFor="pricing-amount-input">
                <input
                  id="pricing-amount-input"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  required
                  value={f.pricingAmount}
                  onChange={(e) => set("pricingAmount")(e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field
                label={t("pricingCurrency")}
                htmlFor="pricing-currency-input"
              >
                <Select
                  id="pricing-currency-input"
                  value={f.pricingCurrency}
                  onChange={set("pricingCurrency")}
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
            htmlFor="pricing-note-input"
            hint={t("pricingNoteHint")}
            className="sm:col-span-3"
          >
            <input
              id="pricing-note-input"
              maxLength={300}
              value={f.pricingNote}
              onChange={(e) => set("pricingNote")(e.target.value)}
              className={inputClass}
            />
          </Field>
        </fieldset>
        <Field
          id="team_size"
          label={t("teamSize")}
          htmlFor="team-input"
          optional={common("optional")}
        >
          <Select
            id="team-input"
            value={f.teamSize}
            onChange={set("teamSize")}
            placeholder={t("choose")}
            options={TEAM_SIZES.map((x) => ({
              value: x,
              label: cat(`team.${x}`),
            }))}
          />
        </Field>
        <Field
          id="funding"
          label={t("funding")}
          htmlFor="funding-input"
          optional={common("optional")}
        >
          <Select
            id="funding-input"
            value={f.funding}
            onChange={set("funding")}
            placeholder={t("choose")}
            options={FUNDING.map((x) => ({
              value: x,
              label: cat(`funding.${x}`),
            }))}
          />
        </Field>
        <Field
          id="tech_stack"
          label={t("techStack")}
          htmlFor="stack-input"
          hint={startup.github_repo ? undefined : t("stackGithubHint")}
          optional={common("optional")}
          className="sm:col-span-2"
        >
          {stackSuggestion.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-caption">
              <span className="text-muted-foreground">
                {t("stackDetected", {
                  items: stackSuggestion
                    .map((v) =>
                      v.startsWith("custom:")
                        ? v.slice("custom:".length)
                        : (stackOptions(locale).find((o) => o.value === v)
                            ?.label ?? v),
                    )
                    .join(", "),
                })}
              </span>
              <button
                type="button"
                onClick={() =>
                  set("techStack")([...f.techStack, ...stackSuggestion])
                }
                className="font-medium text-brand-text hover:underline"
              >
                {t("stackAddDetected")}
              </button>
            </div>
          )}
          <VocabCombobox
            id="stack-input"
            options={stackOptions(locale)}
            value={f.techStack}
            onChange={set("techStack")}
            max={24}
            placeholder={t("stackPlaceholder")}
            toCustom={toCustomStack}
            customLabel={(text) => t("addCustom", { text })}
            describeCustom={(v) => v.slice("custom:".length)}
            labels={comboLabels}
          />
        </Field>
        <Field
          id="marketing_channels"
          label={t("marketingChannels")}
          htmlFor="channels-input"
          optional={common("optional")}
          className="sm:col-span-2"
        >
          <VocabCombobox
            id="channels-input"
            options={channelOptions(locale)}
            value={f.channels}
            onChange={set("channels")}
            max={MAX_CHANNELS}
            placeholder={t("channelsPlaceholder")}
            toCustom={toCustomChannel}
            customLabel={(text) => t("addCustom", { text })}
            describeCustom={(v) => channelLabel(v, locale)}
            labels={comboLabels}
          />
        </Field>
        <Field
          id="build_story"
          label={t("buildStory")}
          htmlFor="story-input"
          hint={t("buildStoryHint")}
          optional={common("optional")}
          className="sm:col-span-2"
        >
          <Textarea
            id="story-input"
            maxLength={280}
            rows={2}
            value={f.buildStory}
            onChange={(e) => set("buildStory")(e.target.value)}
          />
        </Field>
        <Field
          id="founder_message"
          label={t("founderMessage")}
          htmlFor="msg-input"
          optional={common("optional")}
          className="sm:col-span-2"
        >
          <Textarea
            id="msg-input"
            maxLength={600}
            rows={4}
            value={f.founderMessage}
            onChange={(e) => set("founderMessage")(e.target.value)}
            aria-describedby="msg-count"
          />
          <p
            id="msg-count"
            aria-live="polite"
            className="text-right text-2xs text-muted-foreground tabular-nums"
          >
            {t("founderMessageCount", { count: f.founderMessage.length })}
          </p>
        </Field>
        {text(
          "founderRole",
          "founder_role",
          t("founderRole"),
          60,
          false,
          t("founderRolePlaceholder"),
        )}
        {text(
          "demoVideo",
          "demo_video_url",
          t("demoVideo"),
          300,
          true,
          "https://youtu.be/…",
        )}

        {error && (
          <p role="alert" className="text-sm text-destructive sm:col-span-2">
            {error}
          </p>
        )}
        <div className="flex gap-2 sm:col-span-2">
          <Button asChild variant="outline" className="px-4">
            <Link href={`/startup/${startup.slug}`}>{common("cancel")}</Link>
          </Button>
          <Button type="submit" disabled={busy} className="px-4">
            {busy ? common("loading") : common("save")}
          </Button>
        </div>
      </form>
    </div>
  );
}
