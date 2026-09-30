"use client";

import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BadgeCheckIcon,
  BookOpenIcon,
  CheckCircle2Icon,
  GitBranchIcon,
  Code2Icon,
  ImageIcon,
  InfoIcon,
  LinkIcon,
  Loader2Icon,
  QuoteIcon,
  SparklesIcon,
  type LucideIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { revalidateStartup } from "@/app/actions/revalidate";
import { Card } from "@/components/core/Card";
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
import type { AutofillDraft } from "@/lib/autofill";
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

// Design.md §5 Edit page (redesign 2026-09-30): seven sections shown one at a time with a
// section nav, completion ticks, a progress header and a sticky save bar. Every field wrapper
// keeps id="<field>", so the profile's "+ Add" deep links (#pricing, #verify-revenue…) open the
// right section and highlight the field.

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

const SECTIONS = [
  { id: "basics", icon: InfoIcon },
  { id: "links", icon: LinkIcon },
  { id: "story", icon: BookOpenIcon },
  { id: "stack", icon: Code2Icon },
  { id: "media", icon: ImageIcon },
  { id: "founder", icon: QuoteIcon },
  { id: "verify", icon: BadgeCheckIcon },
] as const satisfies readonly { id: string; icon: LucideIcon }[];
type SectionId = (typeof SECTIONS)[number]["id"];

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
  const e = useTranslations("Edit");
  const p = useTranslations("Profile");
  const lt = useTranslations("Links");
  const lf = useTranslations("LookingFor");
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

  const initial = useMemo(
    () => ({
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
    }),
    [startup],
  );
  type Form = typeof initial;

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState<Form>(initial);
  const [logo, setLogo] = useState<File | null>(null);
  const [active, setActive] = useState<SectionId>("basics");
  const [shotCount, setShotCount] = useState(screenshots.length);
  const topRef = useRef<HTMLDivElement>(null);

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
    <K extends keyof Form>(k: K) =>
    (v: Form[K]) =>
      setF((s) => ({ ...s, [k]: v }));
  const dirty = logo !== null || JSON.stringify(f) !== JSON.stringify(initial);

  const go = (id: SectionId) => {
    setActive(id);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Deep link (#field from the profile's "+ Add"): open that field's section, then highlight it.
  // Runs on load and on in-page hash changes.
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const open = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      const el = id ? document.getElementById(id) : null;
      const target = el?.closest<HTMLElement>("[data-section]")?.dataset
        .section as SectionId | undefined;
      if (!el || !target) return;
      setActive(target);
      timers.push(
        setTimeout(() => {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.classList.add("ring-2", "ring-brand/60", "rounded-md");
          el.querySelector<HTMLElement>("input, textarea, select")?.focus({
            preventScroll: true,
          });
        }, 50),
        setTimeout(() => el.classList.remove("ring-2", "ring-brand/60"), 2600),
      );
    };
    open();
    window.addEventListener("hashchange", open);
    return () => {
      window.removeEventListener("hashchange", open);
      timers.forEach(clearTimeout);
    };
  }, []);

  // ---- completion (progress header + nav ticks) ----------------------------------------------
  const hasLink = LINK_KINDS.some((k) => f.links[k].trim());
  const done: Record<SectionId, boolean[]> = {
    basics: [
      Boolean(f.name.trim()),
      Boolean(f.tagline.trim()),
      Boolean(f.description.trim()),
      Boolean(logo || startup.logo_path),
    ],
    links: [
      hasLink,
      f.country !== "TH" || Boolean(f.province),
      Boolean(f.founded),
    ],
    story: [
      Boolean(f.valueProposition.trim()),
      Boolean(f.problemSolved.trim()),
      Boolean(f.audience),
      Boolean(f.pricingPeriod || f.pricingNote.trim()),
      Boolean(f.teamSize),
      Boolean(f.funding),
    ],
    stack: [
      f.aiTools.length > 0,
      f.techStack.length > 0,
      f.channels.length > 0,
    ],
    media: [shotCount > 0, Boolean(f.demoVideo.trim())],
    founder: [
      Boolean(f.founderMessage.trim()),
      Boolean(f.founderRole.trim()),
      Boolean(f.buildStory.trim()),
    ],
    verify: [connections.length > 0],
  };
  const all = Object.values(done).flat();
  const pct = Math.round((all.filter(Boolean).length / all.length) * 100);
  const nextMissing = SECTIONS.find((s) => done[s.id].some((d) => !d));

  // ---- AI / website autofill ------------------------------------------------------------------
  const [filling, setFilling] = useState(false);
  const [filled, setFilled] = useState<{ n: number; before: Form } | null>(
    null,
  );
  async function autofill() {
    setFilling(true);
    try {
      const res = await fetch(`/api/startups/${startup.id}/autofill`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ locale }),
      });
      const body = (await res.json()) as
        { draft: AutofillDraft } | { error: string };
      if (!res.ok || !("draft" in body)) {
        toast.error(
          e(
            "error" in body && body.error === "no_website"
              ? "autofillNoSite"
              : "autofillFailed",
          ),
        );
        return;
      }
      const d = body.draft;
      const before = f;
      const next = { ...f };
      let n = 0;
      const fill = <K extends keyof Form>(k: K, v: Form[K] | undefined) => {
        const cur = next[k];
        const empty = Array.isArray(cur) ? cur.length === 0 : !cur;
        if (v !== undefined && (Array.isArray(v) ? v.length : v) && empty) {
          next[k] = v;
          n++;
        }
      };
      fill("tagline", d.tagline);
      fill("description", d.description);
      fill("valueProposition", d.valueProposition);
      fill("problemSolved", d.problemSolved);
      fill("audience", d.audience);
      fill("techStack", d.techStack);
      if (d.category && next.category === "other" && d.category !== "other") {
        next.category = d.category;
        n++;
      }
      if (!next.pricingPeriod && d.pricingPeriod) {
        next.pricingPeriod = d.pricingPeriod;
        if (d.pricingAmount != null)
          next.pricingAmount = String(d.pricingAmount);
        if (d.pricingCurrency) next.pricingCurrency = d.pricingCurrency;
        n++;
      }
      fill("pricingNote", d.pricingNote);
      setF(next);
      setFilled({ n, before });
      if (n === 0) toast.info(e("autofillNothing"));
    } catch {
      toast.error(e("autofillFailed"));
    } finally {
      setFilling(false);
    }
  }

  // ---- tech stack from a public GitHub repo --------------------------------------------------
  const [detecting, setDetecting] = useState(false);
  const [detected, setDetected] = useState<string[] | null>(null);
  const githubLink = f.links.github.trim() || startup.github_url || "";
  async function detectFromGithub() {
    setDetecting(true);
    try {
      const res = await fetch(`/api/startups/${startup.id}/detect-stack`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ repo: githubLink }),
      });
      const body = (await res.json()) as { labels?: string[]; error?: string };
      if (!res.ok || !body.labels) {
        toast.error(
          e(
            body.error === "repo_not_found"
              ? "stackRepoNotFound"
              : body.error === "slow_down"
                ? "stackSlowDown"
                : "stackDetectFailed",
          ),
        );
        return;
      }
      setDetected(body.labels);
      if (suggestedStackValues(body.labels, f.techStack).length === 0)
        toast.info(e("stackNothingNew"));
    } catch {
      toast.error(e("stackDetectFailed"));
    } finally {
      setDetecting(false);
    }
  }

  // ---- save -----------------------------------------------------------------------------------
  const fail = (section: SectionId, message: string) => {
    setError(message);
    go(section);
  };

  async function save(ev: React.FormEvent) {
    ev.preventDefault();
    setError(null);
    if (!f.name.trim()) return fail("basics", t("nameRequired"));
    if (logo && logo.size > MAX_LOGO_BYTES)
      return fail("basics", t("logoTooBig"));
    // Each link box only accepts its own kind (a Play link in the LINE box is an error).
    const links: Record<string, string | null> = {};
    for (const kind of LINK_KINDS) {
      const raw = f.links[kind].trim();
      const parsed = raw ? parseProjectLink(raw) : null;
      if (raw && parsed?.kind !== kind) return fail("links", lt("invalid"));
      links[LINK_COLUMN[kind]] = parsed?.url ?? null;
    }
    if (Object.values(links).every((v) => !v))
      return fail("links", lt("needOne"));
    if (f.country === "TH" && !f.province)
      return fail("links", t("provinceRequired"));
    const amount = f.pricingAmount.trim() ? Number(f.pricingAmount) : null;
    const period = f.pricingPeriod || null;
    const priced = period !== null && period !== "free";
    if (priced && (amount === null || !Number.isFinite(amount) || amount < 0))
      return fail("story", t("pricingAmount"));
    const demoVideo = f.demoVideo.trim();
    if (demoVideo && !videoEmbed(demoVideo))
      return fail("media", t("demoVideoInvalid"));
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

  // Stack found in the repo (on demand, or saved by GitHub build proof): add it in one click.
  const stackSuggestion = suggestedStackValues(
    detected ?? startup.build_stack,
    f.techStack,
  );

  const text = (
    key: keyof Form,
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
        onChange={(ev) => set(key)(ev.target.value as never)}
        className={inputClass}
      />
    </Field>
  );

  const index = SECTIONS.findIndex((s) => s.id === active);
  const prev = SECTIONS[index - 1];
  const next = SECTIONS[index + 1];

  const section = (
    id: SectionId,
    children: React.ReactNode,
    action?: React.ReactNode,
  ) => (
    <section
      data-section={id}
      hidden={active !== id}
      aria-labelledby={`section-${id}`}
    >
      <Card className="space-y-5 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h2 id={`section-${id}`} className="text-sm font-bold">
              {e(`section.${id}`)}
            </h2>
            <p className="text-caption text-muted-foreground">
              {e(`hint.${id}`)}
            </p>
          </div>
          {action}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">{children}</div>
        <div className="flex justify-between gap-2 border-t pt-4">
          {prev ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => go(prev.id)}
            >
              <ArrowLeftIcon aria-hidden="true" />
              {e(`section.${prev.id}`)}
            </Button>
          ) : (
            <span />
          )}
          {next && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => go(next.id)}
            >
              {e(`section.${next.id}`)}
              <ArrowRightIcon aria-hidden="true" />
            </Button>
          )}
        </div>
      </Card>
    </section>
  );

  return (
    <div ref={topRef} className="scroll-mt-20 space-y-5">
      {/* Progress header */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2 text-caption">
          <span className="font-semibold">{e("progress", { pct })}</span>
          {nextMissing && (
            <button
              type="button"
              onClick={() => go(nextMissing.id)}
              className="text-brand-text hover:underline"
            >
              {e("nextStep", { section: e(`section.${nextMissing.id}`) })} →
            </button>
          )}
        </div>
        <div
          className="h-1.5 overflow-hidden rounded-full bg-secondary"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={e("progress", { pct })}
        >
          <div
            className="h-full rounded-full bg-brand transition-[width]"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

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

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[14rem_minmax(0,1fr)]">
        {/* Section nav: sticky column on desktop, scrolling chips on mobile */}
        <nav
          aria-label={e("sectionsLabel")}
          className="min-w-0 lg:sticky lg:top-20 lg:self-start"
        >
          <ul className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
            {SECTIONS.map(({ id, icon: Icon }) => {
              const d = done[id];
              const complete = d.every(Boolean);
              return (
                <li key={id} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => go(id)}
                    aria-current={active === id ? "step" : undefined}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs whitespace-nowrap transition-colors",
                      active === id
                        ? "bg-secondary font-semibold text-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                  >
                    <Icon className="size-3.5 shrink-0" aria-hidden="true" />
                    <span className="flex-1">{e(`section.${id}`)}</span>
                    {complete ? (
                      <CheckCircle2Icon
                        className="size-3.5 shrink-0 text-positive"
                        aria-label={e("complete")}
                      />
                    ) : (
                      <span className="text-2xs text-faint tabular-nums">
                        {d.filter(Boolean).length}/{d.length}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="min-w-0 space-y-4">
          {filled && (
            <p
              role="status"
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-brand/40 bg-brand/5 px-3 py-2 text-caption"
            >
              {e("autofillDone", { n: filled.n })}
              <button
                type="button"
                onClick={() => {
                  setF(filled.before);
                  setFilled(null);
                }}
                className="text-brand-text hover:underline"
              >
                {e("undo")}
              </button>
            </p>
          )}

          <form id="startup-form" onSubmit={save} noValidate>
            {section(
              "basics",
              <>
                <Field id="name" label={t("name")} htmlFor="name-input">
                  <input
                    id="name-input"
                    required
                    maxLength={80}
                    value={f.name}
                    onChange={(ev) => set("name")(ev.target.value)}
                    className={inputClass}
                  />
                </Field>
                <Field
                  id="category"
                  label={t("category")}
                  htmlFor="category-input"
                >
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
                    rows={5}
                    value={f.description}
                    onChange={(ev) => set("description")(ev.target.value)}
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
                    onChange={(ev) => setLogo(ev.target.files?.[0] ?? null)}
                    className="text-xs text-muted-foreground file:mr-3 file:rounded-md file:border file:bg-input/30 file:px-3 file:py-1.5 file:text-xs file:text-foreground"
                  />
                </Field>
              </>,
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={autofill}
                disabled={filling || !startup.website_url}
                title={startup.website_url ? undefined : e("autofillNoSite")}
              >
                {filling ? (
                  <Loader2Icon className="animate-spin" aria-hidden="true" />
                ) : (
                  <SparklesIcon aria-hidden="true" />
                )}
                {e("autofill")}
              </Button>,
            )}

            {section(
              "links",
              <>
                <fieldset
                  id="links"
                  className="grid scroll-mt-24 gap-4 sm:col-span-2 sm:grid-cols-2"
                >
                  <legend className="mb-2 text-xs font-medium">
                    {t("links")}
                  </legend>
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
                        onChange={(ev) =>
                          set("links")({ ...f.links, [kind]: ev.target.value })
                        }
                        className={inputClass}
                      />
                    </Field>
                  ))}
                </fieldset>
                <Field
                  id="country"
                  label={t("country")}
                  htmlFor="country-input"
                >
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
                {f.country === "TH" ? (
                  <Field
                    id="province"
                    label={t("province")}
                    htmlFor="province-input"
                  >
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
                ) : (
                  <span id="province" hidden />
                )}
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
                    onChange={(ev) => set("founded")(ev.target.value)}
                    className={inputClass}
                  />
                </Field>
              </>,
            )}

            {section(
              "story",
              <>
                {text(
                  "valueProposition",
                  "value_proposition",
                  t("valueProposition"),
                  300,
                  true,
                )}
                {text(
                  "problemSolved",
                  "problem_solved",
                  t("problemSolved"),
                  300,
                  true,
                )}
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
                  <Field
                    label={t("pricingPeriod")}
                    htmlFor="pricing-period-input"
                  >
                    <Select
                      id="pricing-period-input"
                      value={f.pricingPeriod}
                      onChange={(v) =>
                        set("pricingPeriod")(v as PricingPeriod | "")
                      }
                      placeholder={t("choose")}
                      options={PRICING_PERIODS.map((x) => ({
                        value: x,
                        label: pr(x),
                      }))}
                    />
                  </Field>
                  {f.pricingPeriod && f.pricingPeriod !== "free" && (
                    <>
                      <Field
                        label={t("pricingAmount")}
                        htmlFor="pricing-amount-input"
                      >
                        <input
                          id="pricing-amount-input"
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step="0.01"
                          value={f.pricingAmount}
                          onChange={(ev) =>
                            set("pricingAmount")(ev.target.value)
                          }
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
                      onChange={(ev) => set("pricingNote")(ev.target.value)}
                      className={inputClass}
                    />
                  </Field>
                </fieldset>
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
              </>,
            )}

            {section(
              "stack",
              <>
                <Field
                  id="ai_tools"
                  label={t("aiTools")}
                  className="sm:col-span-2"
                >
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
                  id="tech_stack"
                  label={t("techStack")}
                  htmlFor="stack-input"
                  hint={githubLink ? undefined : t("stackGithubHint")}
                  optional={common("optional")}
                  className="sm:col-span-2"
                >
                  <div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={detectFromGithub}
                      disabled={detecting || !githubLink}
                    >
                      {detecting ? (
                        <Loader2Icon
                          className="animate-spin"
                          aria-hidden="true"
                        />
                      ) : (
                        <GitBranchIcon aria-hidden="true" />
                      )}
                      {e("stackFromGithub")}
                    </Button>
                  </div>
                  {stackSuggestion.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-caption">
                      <span className="text-muted-foreground">
                        {t("stackDetected", {
                          items: stackSuggestion
                            .map((v) =>
                              v.startsWith("custom:")
                                ? v.slice("custom:".length)
                                : (stackOptions(locale).find(
                                    (o) => o.value === v,
                                  )?.label ?? v),
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
                  id="looking_for"
                  label={t("lookingFor")}
                  optional={common("optional")}
                  className="sm:col-span-2"
                >
                  <ToggleChips
                    options={LOOKING_FOR.map((x) => ({
                      value: x,
                      label: lf(x),
                    }))}
                    value={f.lookingFor}
                    onChange={set("lookingFor")}
                  />
                </Field>
              </>,
            )}

            {section(
              "media",
              <>
                <div id="screenshots" className="scroll-mt-24 sm:col-span-2">
                  <ScreenshotsManager
                    startupId={startup.id}
                    initial={screenshots}
                    onCountChange={setShotCount}
                  />
                </div>
                {text(
                  "demoVideo",
                  "demo_video_url",
                  t("demoVideo"),
                  300,
                  true,
                  "https://youtu.be/…",
                )}
              </>,
            )}

            {section(
              "founder",
              <>
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
                    rows={5}
                    value={f.founderMessage}
                    onChange={(ev) => set("founderMessage")(ev.target.value)}
                    aria-describedby="msg-count"
                  />
                  <p
                    id="msg-count"
                    aria-live="polite"
                    className="text-right text-2xs text-muted-foreground tabular-nums"
                  >
                    {t("founderMessageCount", {
                      count: f.founderMessage.length,
                    })}
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
                    onChange={(ev) => set("buildStory")(ev.target.value)}
                  />
                </Field>
              </>,
            )}
          </form>

          {section(
            "verify",
            <div id="verify" className="sm:col-span-2">
              <VerifyPanel
                startupId={startup.id}
                slug={startup.slug}
                connections={connections}
                websiteHost={websiteHost(startup.website_url)}
                githubLogin={githubLogin}
              />
            </div>,
          )}

          {/* Sticky save bar: saves the whole form from any section */}
          <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center justify-between gap-3 border-t bg-background/95 px-4 py-3 backdrop-blur">
            <p
              role={error ? "alert" : "status"}
              className={cn(
                "flex items-center gap-2 text-caption",
                error ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {error ??
                (dirty ? (
                  <>
                    <span
                      className="size-2 rounded-full bg-warning"
                      aria-hidden="true"
                    />
                    {e("unsaved")}
                  </>
                ) : (
                  e("allSaved")
                ))}
            </p>
            <div className="flex gap-2">
              <Button asChild variant="outline" className="px-4">
                <Link href={`/startup/${startup.slug}`}>
                  {common("cancel")}
                </Link>
              </Button>
              <Button
                type="submit"
                form="startup-form"
                disabled={busy}
                className="px-4"
              >
                {busy ? common("loading") : common("save")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
