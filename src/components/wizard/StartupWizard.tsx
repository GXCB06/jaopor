"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { StartupLogo } from "@/components/StartupBits";
import { useRouter } from "@/i18n/navigation";
import { CATEGORIES, slugify } from "@/lib/catalog";
import { parseProjectLink, websiteHost, type LinkColumn } from "@/lib/links";
import type { SiteAutofill } from "@/lib/net/link-preview";
import { createClient } from "@/lib/supabase/client";
import { revalidateStartup } from "@/app/actions/revalidate";
import { useSessionDraft } from "@/lib/use-session-draft";
import { cn } from "@/lib/utils";
import { Field, Select, inputClass } from "./fields";
import { VerifyPanel } from "./VerifyPanel";
import { categoryName } from "@/lib/config/display";

// Design.md §5 Add-startup wizard v2 (first-user test 2026-10-05: "adding a startup is hard").
// 1) List it: the project link first, which auto-fills name, one-liner and logo from the site;
//    then category.  2) Verify: the VerifyPanel chooser ("What do you have?"), or skip.
// AI tools, looking-for, screenshots and the rest are added later on /dashboard/[id]/edit.

const MAX_LOGO_BYTES = 1024 * 1024;
const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"];
const TAGLINE_MAX = 140;

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

/** The auto-filled logo (a PNG data: URL from /api/startups/preview) as an uploadable file. */
function dataUrlToPng(dataUrl: string): File {
  const bin = atob(dataUrl.slice(dataUrl.indexOf(",") + 1));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new File([bytes], "logo.png", { type: "image/png" });
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
  const locale = useLocale();
  const lt = useTranslations("Links");
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

  const [link, setLink] = useState("");
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [category, setCategory] = useState("ai");
  // An uploaded logo and its object URL for the preview tile.
  const [logo, setLogo] = useState<{ file: File; url: string } | null>(null);
  const [autoLogo, setAutoLogo] = useState<string | null>(null);
  // Auto-fill status for one link: reading → done (nothing is shown when the site can't be read).
  const [fill, setFill] = useState<{
    url: string;
    state: "reading" | "done";
  } | null>(null);
  // The last auto-filled values: a field still holding one may be replaced by the next fill,
  // anything the founder typed never is.
  const auto = useRef<{ name: string; tagline: string }>({
    name: "",
    tagline: "",
  });

  // Survive a language switch (the layout remounts): keep the typed fields and, after step 1,
  // the created project, so step 2 doesn't fall back to step 1 and create a duplicate.
  const clearDraft = useSessionDraft(
    "jaopor:draft:new-startup",
    { step, saved, name, link, tagline, category },
    (d) => {
      setStep(d.step);
      setSaved(d.saved);
      setName(d.name ?? "");
      setLink(d.link ?? "");
      setTagline(d.tagline ?? "");
      setCategory(d.category ?? "ai");
    },
  );

  const parsed = parseProjectLink(link);
  const siteUrl = parsed?.kind === "website" ? parsed.url : null;

  useEffect(() => {
    if (step !== 1 || !siteUrl) return;
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      setFill({ url: siteUrl, state: "reading" });
      try {
        const res = await fetch("/api/startups/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ link: siteUrl }),
          signal: ctrl.signal,
        });
        if (!res.ok) return setFill(null);
        const site = (await res.json()) as SiteAutofill;
        const prev = auto.current;
        const next = {
          name: site.name?.slice(0, 80) ?? "",
          tagline: site.tagline?.slice(0, TAGLINE_MAX) ?? "",
        };
        if (next.name)
          setName((cur) =>
            !cur.trim() || cur === prev.name ? next.name : cur,
          );
        if (next.tagline)
          setTagline((cur) =>
            !cur.trim() || cur === prev.tagline ? next.tagline : cur,
          );
        auto.current = next;
        setAutoLogo(site.logo);
        setFill({ url: siteUrl, state: "done" });
      } catch {
        if (!ctrl.signal.aborted) setFill(null);
      }
    }, 600);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [siteUrl, step]);

  function pickLogo(file: File | null) {
    if (logo) URL.revokeObjectURL(logo.url);
    setLogo(file ? { file, url: URL.createObjectURL(file) } : null);
  }

  const shownLogo = logo?.url ?? autoLogo;
  const fillState = fill && fill.url === siteUrl ? fill.state : null;

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!parsed) return setError(lt("invalid"));
    if (logo && logo.file.size > MAX_LOGO_BYTES)
      return setError(t("logoTooBig"));
    const base = slugify(name) || "startup";
    setBusy(true);
    try {
      const supabase = createClient();
      const file = logo?.file ?? (autoLogo ? dataUrlToPng(autoLogo) : null);
      const logoPath = file ? await uploadLogo(userId, file) : null;
      // Auto slug; on a clash retry once with a short random suffix (no slug field to fill in).
      for (const slug of [base, `${base.slice(0, 44)}-${randomSuffix()}`]) {
        const { data, error: dbErr } = await supabase
          .from("startups")
          .insert({
            owner_id: userId,
            name: name.trim(),
            slug,
            tagline: tagline.trim() || null,
            ...({ [parsed.column]: parsed.url } as Partial<
              Record<LinkColumn, string>
            >),
            category,
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

  const goToProfile = () => {
    if (!saved) return;
    clearDraft();
    void revalidateStartup(saved.id);
    router.push({
      pathname: `/startup/${saved.slug}`,
      // Post-listing share moment (Design.md §9): the profile opens the share dialog.
      query: verified ? { verified: "1" } : { new: "1" },
    });
  };

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
            <Field
              label={t("projectLink")}
              htmlFor="link"
              className="sm:col-span-2"
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
                autoFocus
                inputMode="url"
                placeholder="yourapp.com · @yourbot"
                maxLength={300}
                value={link}
                onChange={(e) => setLink(e.target.value)}
                className={inputClass}
              />
              {fillState && (
                <p
                  role="status"
                  className={cn(
                    "text-caption",
                    fillState === "done"
                      ? "text-brand-text"
                      : "text-muted-foreground",
                  )}
                >
                  {fillState === "done"
                    ? t("autofillDone")
                    : t("autofillReading")}
                </p>
              )}
            </Field>
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
            <Field label={t("category")} htmlFor="category">
              <Select
                id="category"
                value={category}
                onChange={setCategory}
                options={CATEGORIES.map((c) => ({
                  value: c,
                  label: categoryName(c, locale),
                }))}
              />
            </Field>
            <Field
              label={t("tagline")}
              htmlFor="tagline"
              optional={common("optional")}
              className="sm:col-span-2"
              action={
                <span className="text-2xs text-faint tabular-nums">
                  {t("taglineCount", { count: tagline.length })}
                </span>
              }
            >
              <input
                id="tagline"
                maxLength={TAGLINE_MAX}
                placeholder={t("taglinePlaceholder")}
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field
              label={t("logo")}
              htmlFor="logo"
              optional={common("optional")}
              hint={
                logo
                  ? t("logoHint")
                  : autoLogo
                    ? t("logoFromSite")
                    : t("logoHint")
              }
              className="sm:col-span-2"
            >
              <div className="flex flex-wrap items-center gap-3">
                <StartupLogo
                  name={name.trim() || "?"}
                  src={shownLogo}
                  size={48}
                  className="rounded-xl"
                />
                <label
                  htmlFor="logo"
                  className="inline-flex h-8 cursor-pointer items-center rounded-md border bg-input/30 px-3 text-xs focus-within:ring-2 focus-within:ring-ring hover:bg-accent"
                >
                  {t("logoUpload")}
                  <input
                    id="logo"
                    type="file"
                    accept={LOGO_TYPES.join(",")}
                    onChange={(e) => pickLogo(e.target.files?.[0] ?? null)}
                    className="sr-only"
                  />
                </label>
                {shownLogo && (
                  <button
                    type="button"
                    onClick={() => {
                      pickLogo(null);
                      setAutoLogo(null);
                    }}
                    className="text-xs text-muted-foreground hover:text-destructive"
                  >
                    {t("logoRemove")}
                  </button>
                )}
              </div>
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
          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <p className="text-xs text-muted-foreground">
              {verified ? "" : t("verifyLater")}
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
