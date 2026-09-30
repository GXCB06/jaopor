"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Link, useRouter } from "@/i18n/navigation";
import {
  AI_TOOLS,
  AUDIENCES,
  CATEGORIES,
  FUNDING,
  TEAM_SIZES,
  type AiTool,
} from "@/lib/catalog";
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
import { cn } from "@/lib/utils";
import { Field, Select, ToggleChips, inputClass } from "./fields";
import { uploadLogo } from "./StartupWizard";
import { VerifyPanel, type ConnectionInfo } from "./VerifyPanel";

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

const list = (s: string, max: number) =>
  s
    .split(",")
    .map((x) => x.trim().slice(0, 40))
    .filter(Boolean)
    .slice(0, max);

export function StartupEditForm({
  userId,
  startup,
  connections,
  githubLogin,
}: {
  userId: string;
  startup: Tables<"startups">;
  connections: ConnectionInfo[];
  githubLogin: string | null;
}) {
  const t = useTranslations("Wizard");
  const p = useTranslations("Profile");
  const lt = useTranslations("Links");
  const lf = useTranslations("LookingFor");
  const st = useTranslations("Sources");
  const common = useTranslations("Common");
  const cat = useTranslations("Catalog");
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
    pricing: startup.pricing ?? "",
    teamSize: startup.team_size ?? "",
    funding: startup.funding ?? "",
    techStack: startup.tech_stack.join(", "),
    channels: startup.marketing_channels.join(", "),
    founderMessage: startup.founder_message ?? "",
  });
  const [logo, setLogo] = useState<File | null>(null);
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
          province: f.province.trim() || null,
          founded_on: f.founded ? `${f.founded}-01` : null,
          ai_tools: f.aiTools,
          logo_path: logoPath,
          value_proposition: f.valueProposition.trim() || null,
          problem_solved: f.problemSolved.trim() || null,
          audience: f.audience || null,
          pricing: f.pricing.trim() || null,
          team_size: f.teamSize || null,
          funding: f.funding || null,
          tech_stack: list(f.techStack, 20),
          marketing_channels: list(f.channels, 10),
          founder_message: f.founderMessage.trim() || null,
        })
        .eq("id", startup.id);
      if (dbErr) throw dbErr;
      toast.success(common("save") + " ✓");
      router.push(`/startup/${startup.slug}`);
      router.refresh();
    } catch {
      setError(common("genericError"));
    } finally {
      setBusy(false);
    }
  }

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
            options={CATEGORIES.map((c) => ({
              value: c,
              label: cat(`category.${c}`),
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
        {text("province", "province", t("province"), 60)}
        <Field id="ai_tools" label={t("aiTools")} className="sm:col-span-2">
          <ToggleChips
            options={AI_TOOLS.map((x) => ({
              value: x,
              label: cat(`tool.${x}`),
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
        {text("pricing", "pricing", t("pricing"), 300)}
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
        {text(
          "techStack",
          "tech_stack",
          t("techStack"),
          400,
          true,
          "Next.js, Supabase, Stripe",
        )}
        {text(
          "channels",
          "marketing_channels",
          t("marketingChannels"),
          300,
          true,
          "Facebook, SEO, TikTok",
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
            maxLength={500}
            rows={3}
            value={f.founderMessage}
            onChange={(e) => set("founderMessage")(e.target.value)}
          />
        </Field>

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
