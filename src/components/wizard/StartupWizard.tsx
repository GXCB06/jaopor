"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "@/i18n/navigation";
import {
  AI_TOOLS,
  AUDIENCES,
  CATEGORIES,
  FUNDING,
  TEAM_SIZES,
  slugify,
  type AiTool,
} from "@/lib/catalog";
import { moneyFull } from "@/lib/format";
import type { Tables } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Field, Select, ToggleChips, inputClass } from "./fields";

// Design.md §6 Add-startup wizard: Basics → Verify revenue → Insights.
// Writes go straight to Supabase with the user's session; RLS + column grants decide what's allowed.

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
const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"];

type Startup = Tables<"startups">;
type Step = 1 | 2 | 3;

const list = (s: string, max: number) =>
  s
    .split(",")
    .map((x) => x.trim().slice(0, 40))
    .filter(Boolean)
    .slice(0, max);

export function StartupWizard({
  userId,
  initial,
  initialStep = 1,
}: {
  userId: string;
  initial?: Startup;
  initialStep?: Step;
}) {
  const t = useTranslations("Wizard");
  const common = useTranslations("Common");
  const errors = useTranslations("Errors");
  const cat = useTranslations("Catalog");
  const locale = useLocale();
  const router = useRouter();
  const supabase = createClient();
  const regionName = useMemo(
    () => new Intl.DisplayNames([locale], { type: "region" }),
    [locale],
  );

  const [step, setStep] = useState<Step>(initialStep);
  const [saved, setSaved] = useState<{ id: number; slug: string } | null>(
    initial ? { id: initial.id, slug: initial.slug } : null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1 — basics
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(Boolean(initial));
  const [website, setWebsite] = useState(initial?.website_url ?? "");
  const [tagline, setTagline] = useState(initial?.tagline ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [category, setCategory] = useState(initial?.category ?? "ai");
  const [country, setCountry] = useState(initial?.country ?? "TH");
  const [province, setProvince] = useState(initial?.province ?? "");
  const [founded, setFounded] = useState(
    initial?.founded_on?.slice(0, 7) ?? "",
  );
  const [aiTools, setAiTools] = useState<AiTool[]>(
    (initial?.ai_tools as AiTool[]) ?? ["claude-code"],
  );
  const [logo, setLogo] = useState<File | null>(null);

  // Step 2 — revenue
  const [key, setKey] = useState("");
  const [verified, setVerified] = useState<{
    mrr: number;
    revenue: number;
  } | null>(null);

  // Step 3 — insights
  const [valueProp, setValueProp] = useState(initial?.value_proposition ?? "");
  const [problem, setProblem] = useState(initial?.problem_solved ?? "");
  const [audience, setAudience] = useState(initial?.audience ?? "");
  const [pricing, setPricing] = useState(initial?.pricing ?? "");
  const [teamSize, setTeamSize] = useState(initial?.team_size ?? "");
  const [funding, setFunding] = useState(initial?.funding ?? "");
  const [founderMessage, setFounderMessage] = useState(
    initial?.founder_message ?? "",
  );
  const [techStack, setTechStack] = useState(
    initial?.tech_stack.join(", ") ?? "",
  );
  const [channels, setChannels] = useState(
    initial?.marketing_channels.join(", ") ?? "",
  );

  async function saveBasics(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (logo && logo.size > MAX_LOGO_BYTES) return setError(t("logoTooBig"));
    setBusy(true);
    try {
      let logoPath = initial?.logo_path ?? null;
      if (logo) {
        const ext =
          logo.type === "image/png"
            ? "png"
            : logo.type === "image/webp"
              ? "webp"
              : "jpg";
        const path = `${userId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("logos")
          .upload(path, logo, { contentType: logo.type });
        if (upErr) throw upErr;
        logoPath = path;
      }
      const row = {
        name: name.trim(),
        slug,
        website_url: website.trim(),
        tagline: tagline.trim() || null,
        description: description.trim() || null,
        category,
        country,
        province: province.trim() || null,
        founded_on: founded ? `${founded}-01` : null,
        ai_tools: aiTools,
        logo_path: logoPath,
      };
      const query = saved
        ? supabase.from("startups").update(row).eq("id", saved.id)
        : supabase.from("startups").insert({ ...row, owner_id: userId });
      const { data, error: dbErr } = await query.select("id, slug").single();
      if (dbErr) {
        if (dbErr.code === "23505") return setError(t("slugTaken"));
        if (dbErr.code === "P0001") return setError(t("limitReached"));
        throw dbErr;
      }
      setSaved(data);
      setStep(initial?.verification_status === "verified" ? 3 : 2);
    } catch {
      setError(common("genericError"));
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (!saved) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/startups/${saved.id}/stripe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        metrics?: { mrrCents: number; revenue30dCents: number };
      };
      if (res.ok && body.ok && body.metrics) {
        setKey("");
        setVerified({
          mrr: body.metrics.mrrCents,
          revenue: body.metrics.revenue30dCents,
        });
      } else {
        const code =
          res.status === 401 ? "unauthorized" : (body.error ?? "server");
        setError(
          errors.has(code) ? errors(code as "server") : errors("server"),
        );
      }
    } catch {
      setError(errors("server"));
    } finally {
      setBusy(false);
    }
  }

  async function saveInsights(e: React.FormEvent) {
    e.preventDefault();
    if (!saved) return;
    setError(null);
    setBusy(true);
    const { error: dbErr } = await supabase
      .from("startups")
      .update({
        value_proposition: valueProp.trim() || null,
        problem_solved: problem.trim() || null,
        audience: audience || null,
        pricing: pricing.trim() || null,
        team_size: teamSize || null,
        funding: funding || null,
        founder_message: founderMessage.trim() || null,
        tech_stack: list(techStack, 20),
        marketing_channels: list(channels, 10),
      })
      .eq("id", saved.id);
    setBusy(false);
    if (dbErr) return setError(common("genericError"));
    router.push({
      pathname: `/startup/${saved.slug}`,
      query: verified ? { verified: "1" } : {},
    });
  }

  const steps = [t("stepBasics"), t("stepRevenue"), t("stepInsights")];

  return (
    <div className="space-y-6">
      <ol className="flex gap-2">
        {steps.map((label, i) => (
          <li
            key={label}
            className={cn(
              "flex-1 border-t-2 pt-2 text-[10px] font-semibold tracking-wider uppercase",
              i + 1 <= step
                ? "border-brand text-foreground"
                : "border-border text-muted-foreground",
            )}
          >
            {i + 1}. {label}
          </li>
        ))}
      </ol>
      <p className="sr-only">{t("step", { current: step, total: 3 })}</p>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {step === 1 && (
        <form onSubmit={saveBasics} className="grid gap-4 sm:grid-cols-2">
          <Field label={t("name")} htmlFor="name">
            <input
              id="name"
              required
              maxLength={80}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!slugEdited) setSlug(slugify(e.target.value));
              }}
              className={inputClass}
            />
          </Field>
          <Field
            label={t("slug")}
            htmlFor="slug"
            hint={`/startup/${slug || "…"}`}
          >
            <input
              id="slug"
              required
              pattern="[a-z0-9](?:[a-z0-9\-]{0,48}[a-z0-9])?"
              maxLength={50}
              value={slug}
              onChange={(e) => {
                setSlugEdited(true);
                setSlug(slugify(e.target.value));
              }}
              className={inputClass}
            />
          </Field>
          <Field
            label={t("website")}
            htmlFor="website"
            className="sm:col-span-2"
          >
            <input
              id="website"
              type="url"
              required
              placeholder={t("websiteHint")}
              maxLength={300}
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field
            label={t("tagline")}
            htmlFor="tagline"
            hint={t("taglineHint")}
            className="sm:col-span-2"
          >
            <input
              id="tagline"
              maxLength={140}
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field
            label={t("description")}
            htmlFor="description"
            optional={common("optional")}
            className="sm:col-span-2"
          >
            <Textarea
              id="description"
              maxLength={2000}
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
          <Field label={t("category")} htmlFor="category">
            <Select
              id="category"
              value={category}
              onChange={setCategory}
              options={CATEGORIES.map((c) => ({
                value: c,
                label: cat(`category.${c}`),
              }))}
            />
          </Field>
          <Field
            label={t("founded")}
            htmlFor="founded"
            optional={common("optional")}
          >
            <input
              id="founded"
              type="month"
              value={founded}
              onChange={(e) => setFounded(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label={t("country")} htmlFor="country">
            <Select
              id="country"
              value={country}
              onChange={setCountry}
              options={COUNTRIES.map((c) => ({
                value: c,
                label: regionName.of(c) ?? c,
              }))}
            />
          </Field>
          <Field
            label={t("province")}
            htmlFor="province"
            optional={common("optional")}
          >
            <input
              id="province"
              maxLength={60}
              value={province}
              onChange={(e) => setProvince(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label={t("aiTools")} className="sm:col-span-2">
            <ToggleChips
              options={AI_TOOLS.map((x) => ({
                value: x,
                label: cat(`tool.${x}`),
              }))}
              value={aiTools}
              onChange={setAiTools}
            />
          </Field>
          <Field
            label={t("logo")}
            htmlFor="logo"
            hint={t("logoHint")}
            optional={common("optional")}
            className="sm:col-span-2"
          >
            <input
              id="logo"
              type="file"
              accept={LOGO_TYPES.join(",")}
              onChange={(e) => setLogo(e.target.files?.[0] ?? null)}
              className="text-xs text-muted-foreground file:mr-3 file:rounded-md file:border file:bg-input/30 file:px-3 file:py-1.5 file:text-xs file:text-foreground"
            />
          </Field>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={busy} className="px-4">
              {busy
                ? common("loading")
                : saved
                  ? common("next")
                  : t("createAndContinue")}
            </Button>
          </div>
        </form>
      )}

      {step === 2 && (
        <div className="space-y-5">
          <div className="space-y-2">
            <h2 className="text-sm font-semibold">{t("revenueTitle")}</h2>
            <p className="text-sm text-muted-foreground">{t("revenueIntro")}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="mb-2 text-[9px] font-semibold tracking-wider text-muted-foreground uppercase">
              {t("howTo")}
            </p>
            <ol className="list-decimal space-y-1 pl-5 text-sm">
              <li>{t("howTo1")}</li>
              <li>{t("howTo2")}</li>
              <li>{t("howTo3")}</li>
            </ol>
          </div>
          {verified ? (
            <p className="rounded-lg border border-brand/40 p-3 text-sm tabular-nums">
              ✓{" "}
              {t("verified", {
                mrr: moneyFull(verified.mrr),
                revenue: moneyFull(verified.revenue),
              })}
            </p>
          ) : (
            <form onSubmit={verify} className="space-y-3">
              <Field label={t("keyLabel")} htmlFor="key">
                <input
                  id="key"
                  type="password"
                  required
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="rk_live_…"
                  maxLength={300}
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  className={cn(inputClass, "font-mono")}
                />
              </Field>
              <Button type="submit" disabled={busy || !key} className="px-4">
                {busy ? t("verifying") : t("verify")}
              </Button>
            </form>
          )}
          <div className="flex items-center justify-between gap-3 border-t pt-4">
            <p className="text-xs text-muted-foreground">
              {verified ? "" : t("noStripe")}
            </p>
            <Button
              variant={verified ? "default" : "outline"}
              onClick={() => setStep(3)}
              className="px-4"
            >
              {verified ? common("next") : common("skip")}
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <form onSubmit={saveInsights} className="grid gap-4 sm:grid-cols-2">
          <h2 className="text-sm font-semibold sm:col-span-2">
            {t("insightsTitle")}
          </h2>
          <Field
            label={t("valueProposition")}
            htmlFor="vp"
            optional={common("optional")}
            className="sm:col-span-2"
          >
            <input
              id="vp"
              maxLength={300}
              value={valueProp}
              onChange={(e) => setValueProp(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field
            label={t("problemSolved")}
            htmlFor="problem"
            optional={common("optional")}
            className="sm:col-span-2"
          >
            <input
              id="problem"
              maxLength={300}
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field
            label={t("audience")}
            htmlFor="audience"
            optional={common("optional")}
          >
            <Select
              id="audience"
              value={audience}
              onChange={setAudience}
              placeholder={t("choose")}
              options={AUDIENCES.map((a) => ({
                value: a,
                label: cat(`audience.${a}`),
              }))}
            />
          </Field>
          <Field
            label={t("pricing")}
            htmlFor="pricing"
            optional={common("optional")}
          >
            <input
              id="pricing"
              maxLength={300}
              value={pricing}
              onChange={(e) => setPricing(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field
            label={t("teamSize")}
            htmlFor="team"
            optional={common("optional")}
          >
            <Select
              id="team"
              value={teamSize}
              onChange={setTeamSize}
              placeholder={t("choose")}
              options={TEAM_SIZES.map((x) => ({
                value: x,
                label: cat(`team.${x}`),
              }))}
            />
          </Field>
          <Field
            label={t("funding")}
            htmlFor="funding"
            optional={common("optional")}
          >
            <Select
              id="funding"
              value={funding}
              onChange={setFunding}
              placeholder={t("choose")}
              options={FUNDING.map((x) => ({
                value: x,
                label: cat(`funding.${x}`),
              }))}
            />
          </Field>
          <Field
            label={t("techStack")}
            htmlFor="stack"
            optional={common("optional")}
            className="sm:col-span-2"
          >
            <input
              id="stack"
              value={techStack}
              onChange={(e) => setTechStack(e.target.value)}
              placeholder="Next.js, Supabase, Stripe"
              className={inputClass}
            />
          </Field>
          <Field
            label={t("marketingChannels")}
            htmlFor="channels"
            optional={common("optional")}
            className="sm:col-span-2"
          >
            <input
              id="channels"
              value={channels}
              onChange={(e) => setChannels(e.target.value)}
              placeholder="Facebook, SEO, TikTok"
              className={inputClass}
            />
          </Field>
          <Field
            label={t("founderMessage")}
            htmlFor="msg"
            optional={common("optional")}
            className="sm:col-span-2"
          >
            <Textarea
              id="msg"
              maxLength={500}
              rows={3}
              value={founderMessage}
              onChange={(e) => setFounderMessage(e.target.value)}
            />
          </Field>
          <div className="flex gap-2 sm:col-span-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(2)}
              className="px-4"
            >
              {common("back")}
            </Button>
            <Button type="submit" disabled={busy} className="px-4">
              {busy ? common("loading") : t("finish")}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
