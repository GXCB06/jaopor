"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { AI_TOOLS, CATEGORIES, slugify, type AiTool } from "@/lib/catalog";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Field, Select, ToggleChips, inputClass } from "./fields";
import { StripeConnect } from "./StripeConnect";

// Design.md §6 Add-startup wizard — 2 short steps (feedback: "too much to fill in").
// 1) name · website · category · built with (+ optional logo)  2) Stripe (or skip).
// Everything else is added later via the profile's "+ Add" cards → /dashboard/[id]/edit.

const MAX_LOGO_BYTES = 1024 * 1024;
const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"];

export async function uploadLogo(userId: string, file: File): Promise<string> {
  const ext =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await createClient()
    .storage.from("logos")
    .upload(path, file, { contentType: file.type });
  if (error) throw error;
  return path;
}

export function StartupWizard({ userId }: { userId: string }) {
  const t = useTranslations("Wizard");
  const common = useTranslations("Common");
  const cat = useTranslations("Catalog");
  const router = useRouter();

  const [step, setStep] = useState<1 | 2>(1);
  const [saved, setSaved] = useState<{ id: number; slug: string } | null>(null);
  const [verified, setVerified] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [category, setCategory] = useState("ai");
  const [aiTools, setAiTools] = useState<AiTool[]>(["claude-code"]);
  const [logo, setLogo] = useState<File | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (logo && logo.size > MAX_LOGO_BYTES) return setError(t("logoTooBig"));
    const base = slugify(name) || "startup";
    setBusy(true);
    try {
      const supabase = createClient();
      const logoPath = logo ? await uploadLogo(userId, logo) : null;
      // Auto slug; on a clash retry once with a short random suffix (no slug field to fill in).
      for (const slug of [
        base,
        `${base.slice(0, 44)}-${Math.random().toString(36).slice(2, 6)}`,
      ]) {
        const { data, error: dbErr } = await supabase
          .from("startups")
          .insert({
            owner_id: userId,
            name: name.trim(),
            slug,
            website_url: normalizeUrl(website),
            category,
            ai_tools: aiTools,
            logo_path: logoPath,
          })
          .select("id, slug")
          .single();
        if (!dbErr) {
          setSaved(data);
          setStep(2);
          return;
        }
        if (dbErr.code === "P0001") return setError(t("limitReached"));
        if (dbErr.code !== "23505") throw dbErr;
      }
      setError(t("slugTaken"));
    } catch {
      setError(common("genericError"));
    } finally {
      setBusy(false);
    }
  }

  const goToProfile = () =>
    saved &&
    router.push({
      pathname: `/startup/${saved.slug}`,
      query: verified ? { verified: "1" } : {},
    });

  return (
    <div className="space-y-6">
      <ol className="flex gap-2">
        {[t("stepBasics"), t("stepRevenue")].map((label, i) => (
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

      {step === 1 && (
        <form onSubmit={create} className="space-y-4">
          <p className="text-sm text-muted-foreground">{t("basicsIntro")}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("name")} htmlFor="name">
              <input
                id="name"
                required
                maxLength={80}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label={t("website")} htmlFor="website">
              <input
                id="website"
                required
                inputMode="url"
                placeholder="yourstartup.com"
                maxLength={300}
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className={inputClass}
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
              label={t("logo")}
              htmlFor="logo"
              optional={common("optional")}
              hint={t("logoHint")}
            >
              <input
                id="logo"
                type="file"
                accept={LOGO_TYPES.join(",")}
                onChange={(e) => setLogo(e.target.files?.[0] ?? null)}
                className="text-xs text-muted-foreground file:mr-3 file:rounded-md file:border file:bg-input/30 file:px-3 file:py-1.5 file:text-xs file:text-foreground"
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
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" disabled={busy} className="px-4">
            {busy ? common("loading") : t("createAndContinue")}
          </Button>
        </form>
      )}

      {step === 2 && saved && (
        <div className="space-y-5">
          <h2 className="text-sm font-semibold">{t("revenueTitle")}</h2>
          <StripeConnect
            startupId={saved.id}
            onVerified={() => setVerified(true)}
          />
          <div className="flex items-center justify-between gap-3 border-t pt-4">
            <p className="text-xs text-muted-foreground">
              {verified ? "" : t("noStripe")}
            </p>
            <Button
              variant={verified ? "default" : "outline"}
              onClick={goToProfile}
              className="px-4"
            >
              {verified ? t("goToProfile") : t("skipToProfile")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/** "yourstartup.com" → "https://yourstartup.com" (the DB requires an http(s) URL). */
export function normalizeUrl(input: string): string {
  const v = input.trim();
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
}
