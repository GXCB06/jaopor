"use client";

import { ArrowLeftIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { StartupCard, type CardStartup } from "@/components/StartupCard";
import { ProvinceField } from "@/components/profile-edit/ProvinceField";
import { Link, useRouter } from "@/i18n/navigation";
import { CATEGORIES, slugify } from "@/lib/catalog";
import {
  checkProjectLink,
  ownWebsiteHost,
  sameWebsite,
  type LinkChoice,
  type LinkColumn,
} from "@/lib/links";
import type { SiteAutofill } from "@/lib/net/link-preview";
import { SOURCE_KIND } from "@/lib/sources/catalog";
import { createClient } from "@/lib/supabase/client";
import { revalidateStartup } from "@/app/actions/revalidate";
import { useSessionDraft } from "@/lib/use-session-draft";
import { cn } from "@/lib/utils";
import { LinkTypeStatus } from "./LinkTypeStatus";
import { linkProblemText } from "./link-text";
import { Field, Select, inputClass } from "./fields";
import { LogoField } from "./LogoField";
import { categoryName } from "@/lib/config/display";

// Step 2 only: kept out of the first screen's JavaScript, then fetched in the background as soon as
// step 1 shows (see the effect below), so it is ready by the time the project is created.
const loadVerifyPanel = () =>
  import("./VerifyPanel").then((m) => m.VerifyPanel);
const VerifyPanel = dynamic(loadVerifyPanel);

// Design.md §5 Add-startup wizard v2 (first-user test 2026-10-05: "adding a startup is hard").
// 1) List it: the project link first, which auto-fills name, one-liner and logo from the site;
//    then category.  2) Verify: the VerifyPanel chooser ("What do you have?"), or skip.
// AI tools, looking-for, screenshots and the rest are added later on /dashboard/[id]/edit.

const MAX_LOGO_BYTES = 1024 * 1024;
const TAGLINE_MAX = 140;

/** A new listing as the card shows it: nothing verified yet, so the muted "not verified" card. */
const PREVIEW_BASE: CardStartup = {
  build_commits: null,
  category: "other",
  is_demo: false,
  logo_path: null,
  looking_for: [],
  mrr_cents: null,
  name: "",
  owner_verified_at: null,
  proof_level: 0,
  revenue_30d_cents: null,
  revenue_all_time_cents: null,
  revenue_prev_30d_cents: null,
  slug: "preview",
  tagline: null,
  verification_status: "unverified",
  visitors_30d: null,
  visitors_prev_30d: null,
};

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

/** Identifies the logo shown on step 1, so going back and saving uploads only a changed logo. */
function logoKey(file: File | null, auto: string | null): string | null {
  if (file) return `file:${file.name}:${file.size}:${file.lastModified}`;
  return auto ? `auto:${auto.length}:${auto.slice(-32)}` : null;
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
  defaultProvince,
}: {
  userId: string;
  githubLogin: string | null;
  /** The founder's profile province: the project's starts the same (UX audit M-10). */
  defaultProvince: string;
}) {
  const t = useTranslations("Wizard");
  const common = useTranslations("Common");
  const locale = useLocale();
  const lt = useTranslations("Links");
  const router = useRouter();

  const [step, setStep] = useState<1 | 2>(1);
  // The project created by step 1. Going back to step 1 edits it instead of creating another.
  const [saved, setSaved] = useState<{
    id: number;
    slug: string;
    website: string | null;
    column?: LinkColumn;
    logo?: string | null;
  } | null>(null);
  // Something connected (the footer's primary button) vs. a proven number (revenue or build proof):
  // only the latter opens the profile with the "Verified!" share dialog (Design.md §3 Moments).
  const [verified, setVerified] = useState(false);
  const [proven, setProven] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [link, setLink] = useState("");
  // A1.2: the detected link type can be corrected (null = use the detection).
  const [linkChoice, setLinkChoice] = useState<LinkChoice | null>(null);
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  // No default: a preselected "AI" silently miscategorised projects (UX audit M-9).
  const [category, setCategory] = useState("");
  const [province, setProvince] = useState(defaultProvince);
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
    { step, saved, name, link, tagline, category, province },
    (d) => {
      setStep(d.step);
      setSaved(d.saved);
      setName(d.name ?? "");
      setLink(d.link ?? "");
      setTagline(d.tagline ?? "");
      setCategory(d.category ?? "");
      setProvince(d.province ?? defaultProvince);
    },
  );

  const check = checkProjectLink(link, linkChoice);
  const parsed = check?.ok ? check : null;
  // Any general link (own site or platform page) for "already listed"; only the project's own
  // site is read for auto-fill (A1.2: a Facebook page isn't the project's website).
  const generalUrl = parsed?.kind === "website" ? parsed.url : null;
  const siteUrl = generalUrl && !parsed?.platform ? generalUrl : null;

  // One business, one listing (Design.md §5 Add-startup wizard v2 "Already listed"): the owner's
  // projects, to catch a website they already listed before a second copy is created.
  const [mine, setMine] = useState<
    { id: number; name: string; website_url: string | null }[]
  >([]);
  useEffect(() => {
    void loadVerifyPanel();
    void createClient()
      .from("startups")
      .select("id, name, website_url")
      .eq("owner_id", userId)
      // Oldest first: a match points at the original listing, not a later copy.
      .order("id")
      .then(({ data }) => setMine(data ?? []));
  }, [userId]);
  // The database allows 5 projects per owner; going back to edit this one is always allowed.
  const atLimit = !saved && mine.length >= 5;
  const existing =
    step === 1 && generalUrl
      ? mine.find(
          (s) => s.id !== saved?.id && sameWebsite(s.website_url, generalUrl),
        )
      : undefined;

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
    if (!parsed) return setError(linkProblemText(lt, check, linkChoice));
    if (existing) return;
    if (!province) return setError(t("provinceRequired"));
    if (logo && logo.file.size > MAX_LOGO_BYTES)
      return setError(t("logoTooBig"));
    const base = slugify(name) || "startup";
    const key = logoKey(logo?.file ?? null, autoLogo);
    setBusy(true);
    try {
      const supabase = createClient();
      const file = logo?.file ?? (autoLogo ? dataUrlToPng(autoLogo) : null);

      // Back from step 2: save the changes to the same project (no second listing).
      if (saved) {
        const links: Partial<Record<LinkColumn, string | null>> = {};
        if (saved.column && saved.column !== parsed.column)
          links[saved.column] = null;
        links[parsed.column] = parsed.url;
        const logoChanged = key !== (saved.logo ?? null);
        const { data, error: dbErr } = await supabase
          .from("startups")
          .update({
            name: name.trim(),
            tagline: tagline.trim() || null,
            ...links,
            category,
            country: "TH",
            province,
            ...(logoChanged
              ? { logo_path: file ? await uploadLogo(userId, file) : null }
              : {}),
          })
          .eq("id", saved.id)
          .select("id, slug, website_url")
          .single();
        if (dbErr) throw dbErr;
        setSaved({
          id: data.id,
          slug: data.slug,
          website: data.website_url,
          column: parsed.column,
          logo: key,
        });
        setStep(2);
        return;
      }

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
            country: "TH",
            province,
            logo_path: logoPath,
          })
          .select("id, slug, website_url")
          .single();
        if (!dbErr) {
          setSaved({
            id: data.id,
            slug: data.slug,
            website: data.website_url,
            column: parsed.column,
            logo: key,
          });
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
      query: proven ? { verified: "1" } : { new: "1" },
    });
  };

  return (
    <div className="space-y-6">
      <ol className="flex gap-2">
        {[t("stepBasics"), t("stepRevenue")].map((label, i) => (
          <li
            key={label}
            className={cn(
              // Readable in Thai: no uppercase, no 10 px (Design.md §3 Typography).
              "flex-1 border-t-2 pt-2 text-caption font-semibold",
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
              hint={link.trim() ? undefined : t("projectLinkHint")}
            >
              <input
                id="link"
                required
                autoFocus
                inputMode="url"
                placeholder="yourapp.com · @yourbot"
                maxLength={300}
                value={link}
                onChange={(e) => {
                  setLink(e.target.value);
                  setLinkChoice(null);
                }}
                className={inputClass}
              />
              {check && (
                <LinkTypeStatus
                  check={check}
                  choice={linkChoice}
                  onChoice={setLinkChoice}
                />
              )}
              {existing && (
                <p
                  role="alert"
                  className="rounded-md border border-warning/40 bg-warning/10 p-3 text-caption"
                >
                  {t("alreadyListed", { name: existing.name })}{" "}
                  <Link
                    href={`/dashboard/${existing.id}/edit`}
                    className="font-semibold whitespace-nowrap text-brand-text hover:underline"
                  >
                    {t("goToExisting")} →
                  </Link>
                </p>
              )}
              {fillState && !existing && (
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
                  {/* C-14: what we read, at the moment we read it. */}
                  <span className="block text-2xs text-faint">
                    {t("autofillPrivacy")}
                  </span>
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
                required
                value={category}
                onChange={setCategory}
                placeholder={t("categoryPlaceholder")}
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
              label={t("province")}
              htmlFor="wizard-province"
              hint={t("provinceHint")}
              className="sm:col-span-2"
            >
              <ProvinceField
                id="wizard-province"
                value={province}
                onChange={setProvince}
                required
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
              <LogoField
                id="logo"
                name={name}
                src={shownLogo}
                onPick={pickLogo}
                onRemove={() => {
                  pickLogo(null);
                  setAutoLogo(null);
                }}
              />
            </Field>
          </div>
          {/* S-2: the card as it will look in the list, updating as they type (not a link). */}
          {name.trim() && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium">{t("previewLabel")}</p>
              <StartupCard
                preview
                large
                logoSrc={shownLogo}
                className="max-w-sm"
                startup={{
                  ...PREVIEW_BASE,
                  name: name.trim(),
                  tagline: tagline.trim() || null,
                  category: category || "other",
                }}
              />
              <p className="text-caption text-muted-foreground">
                {t("previewHint")}
              </p>
            </div>
          )}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          {/* C-13: the 5-project limit up front, not after filling everything in. */}
          {atLimit && (
            <p
              role="note"
              className="rounded-md border border-warning/40 bg-warning/10 p-3 text-caption"
            >
              {t("limitAhead")}{" "}
              <Link
                href="/dashboard/startups"
                className="font-semibold whitespace-nowrap text-brand-text hover:underline"
              >
                →
              </Link>
            </p>
          )}
          {/* C-12: on phones the button stays reachable while the keyboard is open. */}
          <div className="max-sm:sticky max-sm:bottom-0 max-sm:-mx-4 max-sm:border-t max-sm:bg-background/95 max-sm:px-4 max-sm:py-3 max-sm:backdrop-blur">
            <Button
              type="submit"
              disabled={busy || !!existing || atLimit}
              className="px-4 max-sm:w-full"
            >
              {busy
                ? common("loading")
                : saved
                  ? t("saveAndContinue")
                  : t("createAndContinue")}
            </Button>
          </div>
        </form>
      )}

      {/* Hidden, not unmounted, on the way back to step 1: sources connected here stay marked. */}
      {saved && (
        <div className="space-y-5" hidden={step !== 2}>
          <VerifyPanel
            startupId={saved.id}
            connections={[]}
            websiteHost={ownWebsiteHost(saved.website)}
            githubLogin={githubLogin}
            onConnected={(source) => {
              setVerified(true);
              if (SOURCE_KIND[source] !== "traffic") setProven(true);
            }}
          />
          <div className="flex flex-wrap items-center gap-3 border-t pt-4">
            <Button
              variant="ghost"
              onClick={() => {
                setError(null);
                setStep(1);
              }}
              className="px-3 text-muted-foreground"
            >
              <ArrowLeftIcon aria-hidden="true" />
              {common("back")}
            </Button>
            <p className="flex-1 text-xs text-muted-foreground">
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
