"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { AI_TOOLS, CATEGORIES, slugify, type AiTool } from "@/lib/catalog";
import {
  LOOKING_FOR,
  parseProjectLink,
  websiteHost,
  type LinkColumn,
  type LookingFor,
} from "@/lib/links";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Field, Select, ToggleChips, inputClass } from "./fields";
import { VerifyPanel } from "./VerifyPanel";

// Design.md §6 Add-startup wizard — 2 short steps (feedback: "too much to fill in").
// 1) name · ONE project link (website / store / LINE / GitHub, auto-detected) · category ·
//    built with · looking for (+ optional logo)   2) VerifyPanel (or skip).
// Everything else is added later via the profile's "+ Add" cards → /dashboard/[id]/edit.

const MAX_LOGO_BYTES = 1024 * 1024;
const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"];

/** 4 random base-36 chars for a slug clash (kept outside render for react-hooks/purity). */
function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 6);
}

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

export function StartupWizard({
  userId,
  githubLogin,
}: {
  userId: string;
  githubLogin: string | null;
}) {
  const t = useTranslations("Wizard");
  const common = useTranslations("Common");
  const cat = useTranslations("Catalog");
  const lt = useTranslations("Links");
  const lf = useTranslations("LookingFor");
  const router = useRouter();

  const [step, setStep] = useState<1 | 2>(1);
  const [saved, setSaved] = useState<{
    id: number;
    slug: string;
    website: string | null;
  } | null>(null);
  const [verified, setVerified] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [link, setLink] = useState("");
  const [category, setCategory] = useState("ai");
  const [aiTools, setAiTools] = useState<AiTool[]>(["claude-code"]);
  const [lookingFor, setLookingFor] = useState<LookingFor[]>([]);
  const [logo, setLogo] = useState<File | null>(null);

  const parsed = parseProjectLink(link);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!parsed) return setError(lt("invalid"));
    if (logo && logo.size > MAX_LOGO_BYTES) return setError(t("logoTooBig"));
    const base = slugify(name) || "startup";
    setBusy(true);
    try {
      const supabase = createClient();
      const logoPath = logo ? await uploadLogo(userId, logo) : null;
      // Auto slug; on a clash retry once with a short random suffix (no slug field to fill in).
      for (const slug of [base, `${base.slice(0, 44)}-${randomSuffix()}`]) {
        const { data, error: dbErr } = await supabase
          .from("startups")
          .insert({
            owner_id: userId,
            name: name.trim(),
            slug,
            ...({ [parsed.column]: parsed.url } as Partial<
              Record<LinkColumn, string>
            >),
            category,
            ai_tools: aiTools,
            looking_for: lookingFor,
            logo_path: logoPath,
          })
          .select("id, slug, website_url")
          .single();
        if (!dbErr) {
          setSaved({ id: data.id, slug: data.slug, website: data.website_url });
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
      // Post-listing share moment (Design.md §9): the profile opens the share dialog.
      query: verified ? { verified: "1" } : { new: "1" },
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
            <Field
              label={t("projectLink")}
              htmlFor="link"
              hint={
                link.trim()
                  ? parsed
                    ? lt("detected", { kind: lt(parsed.kind) })
                    : lt("invalid")
                  : t("projectLinkHint")
              }
            >
              <input
                id="link"
                required
                inputMode="url"
                placeholder="yourapp.com · @yourbot"
                maxLength={300}
                value={link}
                onChange={(e) => setLink(e.target.value)}
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
            <Field
              label={t("lookingFor")}
              optional={common("optional")}
              className="sm:col-span-2"
            >
              <ToggleChips
                options={LOOKING_FOR.map((x) => ({ value: x, label: lf(x) }))}
                value={lookingFor}
                onChange={setLookingFor}
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
          <VerifyPanel
            startupId={saved.id}
            slug={saved.slug}
            connections={[]}
            websiteHost={websiteHost(saved.website)}
            githubLogin={githubLogin}
            onConnected={() => setVerified(true)}
          />
          <div className="flex items-center justify-between gap-3 border-t pt-4">
            <p className="text-xs text-muted-foreground">
              {verified ? "" : t("skipVerify")}
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
