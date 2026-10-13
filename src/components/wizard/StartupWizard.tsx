"use client";

import {
  ArrowLeftIcon,
  ChartColumnIcon,
  CompassIcon,
  GitBranchIcon,
  CircleCheckIcon,
  CreditCardIcon,
  EyeIcon,
  Link2Icon,
  MapPinIcon,
  MedalIcon,
  PencilLineIcon,
  Share2Icon,
  ShieldCheckIcon,
  SproutIcon,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { StartupCard, type CardStartup } from "@/components/StartupCard";
import { ProvinceField } from "@/components/profile-edit/ProvinceField";
import { Link, useRouter } from "@/i18n/navigation";
import { isCategory, slugify } from "@/lib/catalog";
import {
  logAddEvent,
  newAttemptId,
  type AddFailedCode,
} from "@/lib/analytics/add-funnel";
import {
  checkProjectLink,
  ownWebsiteHost,
  sameWebsite,
  type LinkChoice,
  type LinkColumn,
} from "@/lib/links";
import type { SiteAutofill } from "@/lib/net/link-preview";
import { SOURCE_KIND, type SourceKind } from "@/lib/sources/catalog";
import { createClient } from "@/lib/supabase/client";
import { revalidateStartup } from "@/app/actions/revalidate";
import { useSessionDraft } from "@/lib/use-session-draft";
import { cn } from "@/lib/utils";
import { useStepScroll } from "@/lib/use-step-scroll";
import { LinkTypeStatus } from "./LinkTypeStatus";
import { linkProblemText } from "./link-text";
import { Field, inputClass } from "./fields";
import { CategoryField } from "./CategoryField";
import { LogoField } from "./LogoField";
import {
  VisibilityChoice,
  WizardIntro,
  WizardProgress,
  WizardSection,
  WizardStepper,
} from "./WizardParts";
import { Card } from "@/components/core/Card";

// Step 2 only: kept out of the first screen's JavaScript, then fetched in the background as soon as
// step 1 shows (see the effect below), so it is ready by the time the project is created.
const loadVerifyPanel = () =>
  import("./VerifyPanel").then((m) => m.VerifyPanel);
const VerifyPanel = dynamic(loadVerifyPanel);

// Design.md §5 Add-startup wizard v2 (first-user test 2026-10-05: "adding a startup is hard").
// 1) List it: the project link first, which auto-fills name, one-liner and logo from the site;
//    then category.  2) Verify: the VerifyPanel metric chooser ("What do you want to prove?"), or
//    skip.
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

/** Metric icons for the stage chips (same as VerifyPanel's rows; kept here so step 1 doesn't load it). */
const KIND_ICON: Record<SourceKind, LucideIcon> = {
  revenue: CreditCardIcon,
  traffic: ChartColumnIcon,
  build: GitBranchIcon,
};

/** Step 2 order for a project without revenue yet: no-key proof first (Design.md §5). */
const EARLY_ORDER: readonly SourceKind[] = ["build", "traffic", "revenue"];

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
  anonymousReady = false,
}: {
  userId: string;
  githubLogin: string | null;
  /** The founder's profile province: the project's starts the same (UX audit M-10). */
  defaultProvince: string;
  /** The anonymous-mode migration is live (else the checkbox stays hidden). */
  anonymousReady?: boolean;
}) {
  const t = useTranslations("Wizard");
  const ts = useTranslations("Sources");
  const an = useTranslations("Anonymous");
  const common = useTranslations("Common");
  const lt = useTranslations("Links");
  const router = useRouter();

  const [step, setStep] = useState<1 | 2>(1);
  // Step 2 stage choice (not stored): "early" puts the no-key proof first.
  const [stage, setStage] = useState<"early" | "revenue" | null>(null);
  // One random id per add-project attempt; kept in the session draft so a refresh continues it.
  const [attemptId, setAttemptId] = useState(() => newAttemptId());
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
  // Design.md §5 Anonymous projects: list it without its name, logo and links.
  const [anonymous, setAnonymous] = useState(false);
  // An uploaded logo and its object URL for the preview tile.
  const [logo, setLogo] = useState<{ file: File; url: string } | null>(null);
  const [autoLogo, setAutoLogo] = useState<string | null>(null);
  // Suggested from the pasted website: a one-click chip, never preselected (UX audit M-9).
  const [suggestedCategory, setSuggestedCategory] = useState<string | null>(
    null,
  );
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
    { step, saved, name, link, tagline, category, province, attemptId },
    (d) => {
      setStep(d.step);
      setSaved(d.saved);
      setName(d.name ?? "");
      setLink(d.link ?? "");
      setTagline(d.tagline ?? "");
      setCategory(d.category ?? "");
      setProvince(d.province ?? defaultProvince);
      if (d.attemptId) setAttemptId(d.attemptId);
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
  // Funnel "opened": once per attempt (the database dedupes by attempt id).
  useEffect(() => {
    logAddEvent(attemptId, "add_opened");
  }, [attemptId]);
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
        const site = (await res.json()) as SiteAutofill & {
          category?: string | null;
        };
        setSuggestedCategory(
          site.category && isCategory(site.category) ? site.category : null,
        );
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

  // Funnel "failed": the reason step 1 refused (never blocks — see add-funnel.ts).
  const failAdd = (code: AddFailedCode) =>
    logAddEvent(attemptId, "add_failed", undefined, { code });

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!parsed) {
      failAdd("invalid_link");
      return setError(linkProblemText(lt, check, linkChoice));
    }
    if (existing) {
      failAdd("already_listed");
      return;
    }
    if (!province) {
      failAdd("province_missing");
      return setError(t("provinceRequired"));
    }
    if (logo && logo.file.size > MAX_LOGO_BYTES) {
      failAdd("logo_too_big");
      return setError(t("logoTooBig"));
    }
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
          // Anonymous: the public row has no website; step 2 still needs the real one.
          website:
            data.website_url ??
            (parsed.column === "website_url" ? parsed.url : null),
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
            // Masked by the database before the row is ever visible (migration anonymous_mode).
            ...(anonymous ? { is_anonymous: true } : {}),
          })
          .select("id, slug, website_url")
          .single();
        if (!dbErr) {
          setSaved({
            id: data.id,
            slug: data.slug,
            // Anonymous: the public row has no website; step 2 still needs the real one.
            website:
              data.website_url ??
              (parsed.column === "website_url" ? parsed.url : null),
            column: parsed.column,
            logo: key,
          });
          logAddEvent(attemptId, "add_created", data.id);
          setStep(2);
          return;
        }
        if (dbErr.code === "P0001") {
          failAdd("limit_reached");
          return setError(t("limitReached"));
        }
        if (dbErr.code !== "23505") throw dbErr;
      }
      failAdd("slug_taken");
      setError(t("slugTaken"));
    } catch {
      failAdd("server");
      setError(common("genericError"));
    } finally {
      setBusy(false);
    }
  }

  const goToProfile = () => {
    if (!saved) return;
    logAddEvent(attemptId, "add_finished", saved.id, { skipped: !verified });
    clearDraft();
    void revalidateStartup(saved.id);
    router.push({
      pathname: `/startup/${saved.slug}`,
      // Post-listing share moment (Design.md §9): the profile opens the share dialog.
      query: proven ? { verified: "1" } : { new: "1" },
    });
  };

  const topRef = useStepScroll<HTMLDivElement>(step);
  // Design.md §5 wizard v3: each part of step 1 shows a check once it's complete.
  const linkDone = Boolean(parsed) && !existing;
  const aboutDone = Boolean(name.trim()) && Boolean(category);
  const placeDone = Boolean(province);
  const sectionsDone = [linkDone, aboutDone, placeDone].filter(Boolean).length;
  // S-2: the card as it will look in the list, updating as they type (not a link).
  const preview = (
    <div className="space-y-2">
      <p className="text-xs font-semibold">{t("previewTitle")}</p>
      <StartupCard
        preview
        large
        logoSrc={anonymous ? null : shownLogo}
        startup={{
          ...PREVIEW_BASE,
          name: anonymous ? an("name") : name.trim() || t("previewPlaceholder"),
          tagline: tagline.trim() || null,
          category: category || "other",
        }}
      />
      <p className="text-caption text-muted-foreground">{t("previewHint")}</p>
    </div>
  );

  return (
    // Next / back starts the new step at its top (useStepScroll), not where the button was.
    <div
      ref={topRef}
      tabIndex={-1}
      className="scroll-mt-20 space-y-6 outline-none"
    >
      <WizardStepper step={step} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="min-w-0">
          {step === 1 && (
            <form onSubmit={create} className="space-y-4">
              {/* Item 8 (owner-stated vs verified) lives in the last chip. */}
              <WizardIntro />
              <WizardSection
                icon={Link2Icon}
                title={t("sections.link")}
                hint={t("sections.linkHint")}
                done={linkDone}
              >
                <Field
                  label={t("projectLink")}
                  htmlFor="link"
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
              </WizardSection>
              <WizardSection
                icon={PencilLineIcon}
                title={t("sections.about")}
                hint={t("sections.aboutHint")}
                done={aboutDone}
              >
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
                  <Field label={t("category")} htmlFor="category">
                    <CategoryField
                      id="category"
                      required
                      value={category}
                      onChange={setCategory}
                      suggestion={suggestedCategory}
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
                </div>
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
              </WizardSection>
              <WizardSection
                icon={MapPinIcon}
                title={t("sections.place")}
                hint={t("sections.placeHint")}
                done={placeDone}
              >
                <Field
                  label={t("province")}
                  htmlFor="wizard-province"
                  hint={t("provinceHint")}
                >
                  <ProvinceField
                    id="wizard-province"
                    value={province}
                    onChange={setProvince}
                    required
                  />
                </Field>
              </WizardSection>
              {anonymousReady && (
                <WizardSection
                  icon={EyeIcon}
                  title={t("sections.visibility")}
                  hint={t("sections.visibilityHint")}
                  done={false}
                >
                  <VisibilityChoice
                    anonymous={anonymous}
                    onChange={setAnonymous}
                    disabled={!!saved}
                    name={name.trim()}
                  />
                </WizardSection>
              )}
              <div className="lg:hidden">{preview}</div>
              <WizardProgress done={sectionsDone} total={3} />
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
                {/* Issue 3: say what step 2 is for before the button is pressed. */}
                <p className="mt-2 text-caption text-muted-foreground">
                  {t("nextVerifyHint")}
                </p>
              </div>
            </form>
          )}

          {/* Hidden, not unmounted, on the way back to step 1: sources connected here stay marked. */}
          {saved && (
            <div className="space-y-5" hidden={step !== 2}>
              <div className="flex items-start gap-3 rounded-xl border border-positive/30 bg-positive/5 p-4">
                <CircleCheckIcon
                  className="mt-0.5 size-5 shrink-0 text-positive"
                  aria-hidden="true"
                />
                <div className="min-w-0 space-y-0.5">
                  <p className="text-sm font-semibold">{t("createdTitle")}</p>
                  <p className="text-caption text-muted-foreground">
                    {t("createdBody", {
                      name: anonymous ? an("name") : name.trim(),
                    })}
                  </p>
                </div>
              </div>
              {/* Design.md §5 wizard v3.2: step 2 as two cards like step 1. Stage first: no
                  revenue yet → no-key proof first. */}
              <WizardSection
                icon={CompassIcon}
                title={t("stage.title")}
                hint={t("stage.hint")}
                done={stage !== null}
              >
                <div
                  role="radiogroup"
                  aria-label={t("stage.title")}
                  className="grid gap-2 sm:grid-cols-2"
                >
                  {(
                    [
                      ["early", SproutIcon, ["build", "traffic"]],
                      ["revenue", CreditCardIcon, ["revenue"]],
                    ] as const
                  ).map(([id, Icon, kinds]) => (
                    <label
                      key={id}
                      className={cn(
                        "flex cursor-pointer flex-col gap-2 rounded-xl border p-3 transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                        stage === id
                          ? "border-brand bg-brand/5"
                          : "bg-card hover:bg-accent",
                      )}
                    >
                      <input
                        type="radio"
                        name="stage"
                        value={id}
                        checked={stage === id}
                        onChange={() => setStage(id)}
                        className="sr-only"
                      />
                      <span className="flex items-center gap-2">
                        <Icon
                          className={cn(
                            "size-4 shrink-0",
                            stage === id
                              ? "text-brand-text"
                              : "text-muted-foreground",
                          )}
                          aria-hidden="true"
                        />
                        <span className="text-sm font-semibold">
                          {t(`stage.${id}`)}
                        </span>
                      </span>
                      <span className="text-caption text-muted-foreground">
                        {t(`stage.${id}Hint`)}
                      </span>
                      {/* What you'd show, with the same icons as the verify rows below. */}
                      <span className="flex flex-wrap gap-1.5">
                        {kinds.map((k) => {
                          const KIcon = KIND_ICON[k];
                          return (
                            <span
                              key={k}
                              className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-0.5 text-2xs text-muted-foreground"
                            >
                              <KIcon className="size-3" aria-hidden="true" />
                              {ts(`metric.${k}`)}
                            </span>
                          );
                        })}
                      </span>
                    </label>
                  ))}
                </div>
              </WizardSection>
              <WizardSection
                icon={ShieldCheckIcon}
                title={ts("metric.title")}
                hint={ts("metric.hint")}
                done={verified}
              >
                <VerifyPanel
                  showTitle={false}
                  order={stage === "early" ? EARLY_ORDER : undefined}
                  startupId={saved.id}
                  connections={[]}
                  websiteHost={ownWebsiteHost(saved.website)}
                  githubLogin={githubLogin}
                  attemptId={attemptId}
                  onConnected={(source) => {
                    setVerified(true);
                    if (SOURCE_KIND[source] !== "traffic") setProven(true);
                  }}
                />
              </WizardSection>
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
                  variant={
                    verified || stage === "early" ? "default" : "outline"
                  }
                  onClick={goToProfile}
                  className="px-4"
                >
                  {verified
                    ? t("goToProfile")
                    : stage === "early"
                      ? t("publishNow")
                      : t("skipToProfile")}
                </Button>
              </div>
            </div>
          )}
        </div>
        {/* Design.md §5 wizard v3: the live card and what comes next, beside the form from lg. */}
        <aside className="hidden space-y-4 lg:sticky lg:top-20 lg:block">
          {preview}
          <Card className="space-y-3 p-4">
            <p className="text-xs font-semibold">{t("afterTitle")}</p>
            <ul className="space-y-2.5">
              {(
                [
                  [ShieldCheckIcon, t("afterVerify")],
                  [Share2Icon, t("afterShare")],
                  [MedalIcon, t("afterOlympics")],
                ] as const
              ).map(([Icon, text]) => (
                <li
                  key={text}
                  className="flex items-start gap-2.5 text-caption text-muted-foreground"
                >
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary">
                    <Icon
                      className="size-3.5 text-brand-text"
                      aria-hidden="true"
                    />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </Card>
        </aside>
      </div>
    </div>
  );
}
