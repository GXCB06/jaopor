"use client";

import {
  ArrowLeftIcon,
  ChartColumnIcon,
  CheckIcon,
  CopyIcon,
  CreditCardIcon,
  ExternalLinkIcon,
  GitBranchIcon,
  ShieldCheckIcon,
  XIcon,
  type LucideIcon,
} from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  METRICS,
  SOURCE_KIND,
  SOURCE_NAME,
  sourcesOfKind,
  type ConnectInput,
  type SourceId,
  type SourceKind,
} from "@/lib/sources/catalog";
import { publicEnv } from "@/lib/public-env";
import { useConfirm } from "@/components/core/useConfirm";
import { cn } from "@/lib/utils";
import { copy } from "@/components/share/copy";
import { logAddEvent } from "@/lib/analytics/add-funnel";
import { Field, inputClass } from "./fields";

// Design.md §5 VerifyPanel: revenue (Stripe | RevenueCat) · visitors (JaoPor snippet | Plausible |
// Umami | Cloudflare) · build proof (GitHub). Every credential is read-only; the server proves it
// before storing. The snippet needs no credential: a visit from the website activates it.
// While nothing is connected it is a chooser instead, grouped by the metric a founder wants to
// prove ("What do you want to prove?", Design.md §5 VerifyPanel chooser; issue 4). It is one
// screen of three rows, so the first-user test's "three groups all open" skip doesn't repeat.

export type ConnectionInfo = {
  source: SourceId;
  status: string;
  lastSyncedAt: string | null;
  lastError: string | null;
  /** Non-secret reminder: key hint, analytics domain, project id or repo. */
  label: string | null;
  /** JaoPor snippet: day the first visit arrived (null while waiting). */
  since: string | null;
  /** JaoPor snippet: our server found it on the website (Owner verified). */
  ownerVerified?: boolean;
};

const KINDS: SourceKind[] = ["revenue", "traffic", "build"];

type FieldSpec = {
  name: keyof ConnectInput;
  label: string; // message key under Sources.<source>
  secret?: boolean;
  placeholder: string;
};

const FIELDS: Record<SourceId, FieldSpec[]> = {
  stripe: [
    { name: "key", label: "key", secret: true, placeholder: "rk_live_…" },
  ],
  revenuecat: [
    { name: "projectId", label: "projectId", placeholder: "proj1a2b3c4d" },
    { name: "key", label: "key", secret: true, placeholder: "sk_…" },
  ],
  plausible: [
    { name: "siteId", label: "siteId", placeholder: "yourapp.com" },
    { name: "key", label: "key", secret: true, placeholder: "••••••••" },
  ],
  umami: [
    {
      name: "shareUrl",
      label: "shareUrl",
      secret: true,
      placeholder: "https://cloud.umami.is/share/…",
    },
  ],
  cloudflare: [
    { name: "accountId", label: "accountId", placeholder: "0123456789abcdef…" },
    { name: "key", label: "key", secret: true, placeholder: "••••••••" },
  ],
  jaopor: [],
  github: [
    { name: "repo", label: "repo", placeholder: "https://github.com/you/app" },
  ],
};

const HOW_TO: Record<SourceId, number> = {
  stripe: 3,
  revenuecat: 3,
  plausible: 2,
  umami: 2,
  cloudflare: 3,
  jaopor: 2,
  github: 2,
};

// Stripe removed permission-prefill params, so we can only deep-link to the create-key form.
const SETTINGS_URL: Partial<Record<SourceId, { live: string; test?: string }>> =
  {
    stripe: {
      live: "https://dashboard.stripe.com/apikeys/create",
      test: "https://dashboard.stripe.com/test/apikeys/create",
    },
    revenuecat: { live: "https://app.revenuecat.com/" },
    plausible: { live: "https://plausible.io/settings/api-keys" },
    umami: { live: "https://cloud.umami.is/" },
    cloudflare: { live: "https://dash.cloudflare.com/profile/api-tokens" },
  };

export function VerifyPanel({
  startupId,
  connections,
  websiteHost,
  githubLogin,
  onConnected,
  attemptId,
}: {
  startupId: number;
  connections: ConnectionInfo[];
  websiteHost: string | null;
  githubLogin: string | null;
  onConnected?: (source: SourceId) => void;
  /** Add-project funnel attempt (fired on the metric choice); omitted on the edit page. */
  attemptId?: string;
}) {
  const t = useTranslations("Sources");
  if (connections.length === 0)
    return (
      <VerifyChooser
        startupId={startupId}
        websiteHost={websiteHost}
        githubLogin={githubLogin}
        onConnected={onConnected}
        attemptId={attemptId}
      />
    );
  return (
    <div id="verify" className="scroll-mt-24 space-y-4">
      <p className="text-sm text-muted-foreground">{t("intro")}</p>
      {KINDS.map((kind) => (
        <SourceGroup
          key={kind}
          kind={kind}
          startupId={startupId}
          connections={connections}
          websiteHost={websiteHost}
          githubLogin={githubLogin}
          onConnected={onConnected}
        />
      ))}
    </div>
  );
}

const METRIC_ICON: Record<SourceKind, LucideIcon> = {
  revenue: CreditCardIcon,
  traffic: ChartColumnIcon,
  build: GitBranchIcon,
};

/** Deep-link target from the profile ("#verify-revenue"…): the metric row carries the id. */
const METRIC_ANCHOR: Record<SourceKind, string> = {
  revenue: "verify-revenue",
  traffic: "verify-traffic",
  build: "verify-build",
};

function VerifyChooser({
  startupId,
  websiteHost,
  githubLogin,
  onConnected,
  attemptId,
}: {
  startupId: number;
  websiteHost: string | null;
  githubLogin: string | null;
  onConnected?: (source: SourceId) => void;
  attemptId?: string;
}) {
  const t = useTranslations("Sources");
  // Which metric is expanded (null = the three metric rows).
  const [metric, setMetric] = useState<SourceKind | null>(null);
  // The source picked within that metric.
  const [source, setSource] = useState<SourceId | null>(null);
  // Sources connected here (the wizard's `connections` never refreshes).
  const [done, setDone] = useState<SourceId[]>([]);
  // JaoPor snippet: whether our server found it on the website (Owner verified).
  const [owner, setOwner] = useState(false);

  // The snippet needs a website; without one only analytics remain (issue 4, metric-first).
  const sourcesFor = (kind: SourceKind): SourceId[] =>
    kind === "traffic" && !websiteHost
      ? sourcesOfKind("traffic").filter((s) => s !== "jaopor")
      : sourcesOfKind(kind);
  const metricDone = (kind: SourceKind) =>
    sourcesFor(kind).some((s) => done.includes(s));

  function openMetric(kind: SourceKind) {
    if (attemptId) logAddEvent(attemptId, "verify_chose", startupId, { choice: kind });
    setMetric(kind);
    setSource(sourcesFor(kind)[0] ?? null);
  }

  const replaces = source
    ? (done.find(
        (s) => s !== source && SOURCE_KIND[s] === SOURCE_KIND[source],
      ) ?? null)
    : null;
  const connected = source ? done.includes(source) : false;

  return (
    <div id="verify" className="scroll-mt-24 space-y-3">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold">{t("metric.title")}</h3>
        <p className="text-caption text-muted-foreground">{t("metric.hint")}</p>
      </div>
      {/* What verifying unlocks, before the choice (Design.md §5, issue 3). */}
      <ul className="flex flex-wrap gap-x-3 gap-y-1 text-caption text-muted-foreground">
        {(t.raw("getStrip") as string[]).map((item) => (
          <li key={item} className="flex items-center gap-1">
            <CheckIcon
              className="size-3.5 shrink-0 text-positive"
              aria-hidden="true"
            />
            {item}
          </li>
        ))}
      </ul>

      {metric === null ? (
        <div className="grid gap-2">
          {METRICS.map((kind) => {
            const Icon = METRIC_ICON[kind];
            const isDone = metricDone(kind);
            const names = sourcesFor(kind)
              .map((s) => SOURCE_NAME[s])
              .join(" · ");
            // Chip reflects the metric's first (default) source.
            const primary = sourcesFor(kind)[0];
            const noKey = primary === "jaopor" || primary === "github";
            return (
              <button
                key={kind}
                id={METRIC_ANCHOR[kind]}
                type="button"
                onClick={() => openMetric(kind)}
                className="flex scroll-mt-24 items-start gap-3 rounded-xl border bg-card p-3 text-left transition-colors hover:bg-accent"
              >
                <Icon
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 space-y-0.5">
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-semibold">
                      {t(`metric.${kind}`)}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 rounded-full border px-2 py-0.5 text-2xs",
                        isDone || noKey
                          ? "border-positive/30 text-positive"
                          : "text-muted-foreground",
                      )}
                    >
                      {isDone ? (
                        <>
                          <CheckIcon
                            className="mr-0.5 inline size-3"
                            aria-hidden="true"
                          />
                          {t("choose.connected")}
                        </>
                      ) : noKey ? (
                        t("choose.noKey")
                      ) : (
                        t("choose.readKey")
                      )}
                    </span>
                  </span>
                  <span className="block text-caption text-muted-foreground">
                    {t(`metric.${kind}Hint`)}
                  </span>
                  <span className="block text-2xs text-faint">{names}</span>
                  <span className="block text-2xs text-faint">
                    {t(`metric.${kind}Note`)}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <button
              type="button"
              onClick={() => {
                setMetric(null);
                setSource(null);
              }}
              className="inline-flex items-center gap-1 text-caption text-muted-foreground hover:text-foreground"
            >
              <ArrowLeftIcon className="size-3.5" aria-hidden="true" />
              {t("choose.change")}
            </button>
            <h3 className="text-sm font-semibold">{t(`metric.${metric}`)}</h3>
          </div>
          <section className="space-y-3 rounded-lg border p-4">
            {sourcesFor(metric).length > 1 && (
              <div
                className="flex flex-wrap gap-1.5"
                role="group"
                aria-label={t(`metric.${metric}`)}
              >
                {sourcesFor(metric).map((s) => (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={s === source}
                    onClick={() => setSource(s)}
                    className={cn(
                      "rounded-md border px-3 py-1 text-xs transition-colors",
                      s === source
                        ? "bg-accent text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {SOURCE_NAME[s]}
                  </button>
                ))}
              </div>
            )}
            {source &&
              (connected ? (
                source === "jaopor" ? (
                  <div className="space-y-3">
                    <OwnerCheck
                      startupId={startupId}
                      host={websiteHost}
                      verified={owner}
                      onChecked={(found) => {
                        setOwner(found);
                        if (found) onConnected?.("jaopor");
                      }}
                    />
                    <SnippetBox projectId={startupId} />
                  </div>
                ) : (
                  <p className="flex items-center gap-2 text-sm text-positive">
                    <CheckIcon className="size-4" aria-hidden="true" />
                    {`${SOURCE_NAME[source]} · ${t("connected")}`}
                  </p>
                )
              ) : (
                <SourceForm
                  key={source}
                  source={source}
                  startupId={startupId}
                  replaces={replaces}
                  websiteHost={websiteHost}
                  githubLogin={githubLogin}
                  onConnected={(s, ownerVerified) => {
                    setDone((d) => [
                      ...d.filter((x) => SOURCE_KIND[x] !== SOURCE_KIND[s]),
                      s,
                    ]);
                    if (s === "jaopor") setOwner(!!ownerVerified);
                    // A snippet not found yet proves nothing: the wizard keeps "verify later" and
                    // the profile opens with the "listed" share dialog, not "Verified!".
                    if (s !== "jaopor" || ownerVerified) onConnected?.(s);
                  }}
                />
              ))}
          </section>
          {connected && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="px-3"
              onClick={() => {
                setMetric(null);
                setSource(null);
              }}
            >
              {t("choose.addAnother")}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Stripe has no pre-filled restricted-key link, so show exactly what to set (Design.md §5
 * VerifyPanel chooser): the connector reads charges and subscriptions, nothing else.
 */
function StripePermissions() {
  const t = useTranslations("Sources");
  const rows: { name: string; level: "Read" | "None" }[] = [
    { name: "Charges", level: "Read" },
    { name: "Subscriptions", level: "Read" },
    { name: t("stripeGuide.rest"), level: "None" },
  ];
  return (
    <figure className="space-y-1.5">
      <figcaption className="text-2xs font-semibold tracking-wider text-muted-foreground uppercase">
        {t("stripeGuide.label")}
      </figcaption>
      <ul className="divide-y rounded-lg border bg-card text-caption">
        {rows.map((r) => (
          <li
            key={r.name}
            className="flex items-center justify-between gap-3 px-3 py-2"
          >
            <span className={r.level === "None" ? "text-muted-foreground" : ""}>
              {r.name}
            </span>
            <span
              className={cn(
                "rounded-md px-2 py-0.5 font-mono text-2xs",
                r.level === "Read"
                  ? "bg-positive/15 font-semibold text-positive"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {r.level}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-2xs text-faint">{t("stripeGuide.caption")}</p>
    </figure>
  );
}

/** What a key lets us store and show, and what it never does (wording matches /security). */
function TrustBox({ kind }: { kind: "revenue" | "traffic" }) {
  const t = useTranslations("Sources");
  const keep = t.raw(`trust.keep.${kind}`) as string[];
  const never = t.raw(`trust.never.${kind}`) as string[];
  return (
    <div className="space-y-3 rounded-xl border bg-muted/30 p-3 text-caption">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <p className="font-semibold">{t("trust.keepTitle")}</p>
          <ul className="space-y-1">
            {keep.map((x) => (
              <li key={x} className="flex gap-1.5">
                <CheckIcon
                  className="mt-0.5 size-3.5 shrink-0 text-positive"
                  aria-hidden="true"
                />
                {x}
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-1.5">
          <p className="font-semibold">{t("trust.neverTitle")}</p>
          <ul className="space-y-1 text-muted-foreground">
            {never.map((x) => (
              <li key={x} className="flex gap-1.5">
                <XIcon
                  className="mt-0.5 size-3.5 shrink-0"
                  aria-hidden="true"
                />
                {x}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="text-muted-foreground">
        {t("trust.revoke")}{" "}
        <Link
          href="/security"
          target="_blank"
          className="font-semibold whitespace-nowrap text-brand-text hover:underline"
        >
          {t("trust.more")} →
        </Link>
      </p>
    </div>
  );
}

function SourceGroup({
  kind,
  startupId,
  connections,
  websiteHost,
  githubLogin,
  onConnected,
}: {
  kind: SourceKind;
  startupId: number;
  connections: ConnectionInfo[];
  websiteHost: string | null;
  githubLogin: string | null;
  onConnected?: (source: SourceId) => void;
}) {
  const t = useTranslations("Sources");
  const sources = sourcesOfKind(kind);
  const current = connections.find((c) => SOURCE_KIND[c.source] === kind);
  const [selected, setSelected] = useState<SourceId>(
    current?.source ?? sources[0],
  );
  const connection = connections.find((c) => c.source === selected);

  return (
    <section
      id={`verify-${kind}`}
      className="scroll-mt-24 space-y-3 rounded-lg border p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{t(kind)}</h3>
        {sources.length > 1 && (
          <div
            className="flex flex-wrap gap-1.5"
            role="group"
            aria-label={t(kind)}
          >
            {sources.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={s === selected}
                onClick={() => setSelected(s)}
                className={cn(
                  "rounded-md border px-3 py-1 text-xs transition-colors",
                  s === selected
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {SOURCE_NAME[s]}
                {current?.source === s && (
                  <CheckIcon
                    className="ml-1 inline size-3 text-positive"
                    aria-hidden="true"
                  />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{t(`${kind}Hint`)}</p>

      {connection ? (
        <ConnectedRow
          startupId={startupId}
          connection={connection}
          websiteHost={websiteHost}
        />
      ) : (
        <SourceForm
          key={selected}
          source={selected}
          startupId={startupId}
          replaces={current?.source ?? null}
          websiteHost={websiteHost}
          githubLogin={githubLogin}
          onConnected={onConnected}
        />
      )}
    </section>
  );
}

function useErrorText() {
  const errors = useTranslations("Errors");
  return (code: string, source: SourceId, detail?: string) =>
    errors.has(code)
      ? errors(code as "server", {
          source: SOURCE_NAME[source],
          detail: detail ?? "",
        })
      : errors("server");
}

function SourceForm({
  source,
  startupId,
  replaces,
  websiteHost,
  githubLogin,
  onConnected,
}: {
  source: SourceId;
  startupId: number;
  replaces: SourceId | null;
  websiteHost: string | null;
  githubLogin: string | null;
  onConnected?: (source: SourceId, ownerVerified?: boolean) => void;
}) {
  const t = useTranslations("Sources");
  const errorText = useErrorText();
  const router = useRouter();
  const [values, setValues] = useState<ConnectInput>(
    source === "plausible" && websiteHost ? { siteId: websiteHost } : {},
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const settings = SETTINGS_URL[source];
  const blocked = source === "github" && !githubLogin;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/startups/${startupId}/sources/${source}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        detail?: string;
        ownerVerified?: boolean;
      };
      if (res.ok && body.ok) {
        // The snippet is only proof once our server found it on the site: until then it says so,
        // never "Verified! The numbers are on your profile" (there are none yet).
        // Analytics counts are "counted", not "verified" (Design.md §3 Verified vs counted).
        if (source !== "jaopor")
          toast.success(
            SOURCE_KIND[source] === "traffic"
              ? t("successCounted", { source: SOURCE_NAME[source] })
              : t("success"),
          );
        else if (body.ownerVerified) toast.success(t("jaopor.ownerFoundToast"));
        else toast.info(t("jaopor.stillMissing", { host: websiteHost ?? "" }));
        onConnected?.(source, body.ownerVerified);
        router.refresh();
      } else {
        const code =
          res.status === 401 ? "unauthorized" : (body.error ?? "server");
        setError(errorText(code, source, body.detail));
      }
    } catch {
      setError(errorText("server", source));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <ol className="list-decimal space-y-1 pl-5 text-sm">
        {Array.from({ length: HOW_TO[source] }, (_, i) => (
          <li key={i}>
            {t(`${source}.howTo${i + 1}` as "stripe.howTo1", {
              // ICU reads a literal "</head>" or "<ID>" as a tag and the message fails to render, so
              // they are passed in as values.
              headTag: "</head>",
              idTag: "<ID>",
            })}
          </li>
        ))}
      </ol>
      {source === "stripe" && <StripePermissions />}
      {settings && (
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="outline" size="sm" className="px-3">
            <a href={settings.live} target="_blank" rel="noopener noreferrer">
              {t("open", { source: SOURCE_NAME[source] })}
              <ExternalLinkIcon />
            </a>
          </Button>
          {settings.test && (
            <a
              href={settings.test}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              {t("openTest")}
            </a>
          )}
        </div>
      )}
      {blocked ? (
        <LinkGithub />
      ) : (
        <form onSubmit={submit} className="space-y-3">
          {source === "jaopor" && <SnippetBox projectId={startupId} />}
          {source === "stripe" && (
            <p className="text-caption text-muted-foreground">
              {t("stripeReadOnlyNote")}
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            {FIELDS[source].map((f) => (
              <Field
                key={f.name}
                label={t(`${source}.${f.label}` as "stripe.key")}
                htmlFor={`${source}-${f.name}`}
                className={FIELDS[source].length === 1 ? "sm:col-span-2" : ""}
              >
                <input
                  id={`${source}-${f.name}`}
                  type={f.secret ? "password" : "text"}
                  required
                  autoComplete="off"
                  spellCheck={false}
                  placeholder={f.placeholder}
                  maxLength={300}
                  value={values[f.name] ?? ""}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [f.name]: e.target.value }))
                  }
                  className={cn(inputClass, "font-mono")}
                />
              </Field>
            ))}
          </div>
          {FIELDS[source].some((f) => f.secret) &&
            SOURCE_KIND[source] !== "build" && (
              <TrustBox
                kind={SOURCE_KIND[source] === "revenue" ? "revenue" : "traffic"}
              />
            )}
          {replaces && replaces !== source && (
            <p className="text-xs text-warning">
              {t("replaceNote", {
                source: SOURCE_NAME[source],
                current: SOURCE_NAME[replaces],
              })}
            </p>
          )}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" size="sm" disabled={busy} className="px-4">
            {busy
              ? t("verifying")
              : source === "jaopor"
                ? t("jaopor.start")
                : t("connect")}
          </Button>
        </form>
      )}
    </div>
  );
}

/**
 * Build proof needs a GitHub identity on the account (the repo must be the user's). Someone who
 * signed in with Google links GitHub here instead of hitting a dead end (UX audit M-11): Supabase
 * `linkIdentity` → GitHub → our callback → back to this page (the wizard restores its step).
 * Requires "manual linking" in the Supabase Auth settings; if it is off, explain the fallback.
 */
function LinkGithub() {
  const t = useTranslations("Sources");
  const locale = useLocale();
  const pathname = usePathname();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function link() {
    setBusy(true);
    setFailed(false);
    const callback = new URL("/api/auth/callback", window.location.origin);
    callback.searchParams.set("locale", locale);
    callback.searchParams.set("next", pathname);
    const { error } = await createClient().auth.linkIdentity({
      provider: "github",
      options: { redirectTo: callback.toString() },
    });
    // On success the browser is already leaving for GitHub.
    if (error) {
      setFailed(true);
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">{t("github.needGithub")}</p>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={link}
        disabled={busy}
        className="px-3"
      >
        <GitBranchIcon aria-hidden="true" />
        {t("github.link")}
      </Button>
      <p className="text-caption text-muted-foreground">
        {t("github.linkHint")}
      </p>
      {failed && (
        <p role="alert" className="text-caption text-warning">
          {t("github.linkFailed")}
        </p>
      )}
    </div>
  );
}

/** Design.md §5 VerifyPanel snippet: the one line founders paste before </head>. */
function SnippetBox({ projectId }: { projectId: number }) {
  const t = useTranslations("Sources");
  const code = `<script defer src="${publicEnv.siteUrl}/v.js" data-project="${projectId}"></script>`;
  return (
    <div className="space-y-2">
      <pre className="overflow-x-auto rounded-lg border bg-card p-3 font-mono text-caption break-all whitespace-pre-wrap">
        {code}
      </pre>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="px-3"
        onClick={() => copy(code, t("jaopor.copied"))}
      >
        <CopyIcon />
        {t("jaopor.copy")}
      </Button>
      {/* S-18: where the line goes on the tools founders actually use. */}
      <details className="rounded-lg border bg-card text-caption">
        <summary className="cursor-pointer px-3 py-2 font-semibold">
          {t("jaopor.whereTitle")}
        </summary>
        <ul className="space-y-1.5 border-t px-3 py-2 text-muted-foreground">
          {WHERE.map((w) => (
            <li key={w}>{t(`jaopor.where.${w}`, { headTag: "</head>" })}</li>
          ))}
        </ul>
      </details>
    </div>
  );
}

const WHERE = [
  "nextjs",
  "vite",
  "framer",
  "webflow",
  "wordpress",
  "wix",
  "html",
] as const;

/**
 * Owner verified (Design.md §5): whether our server found the snippet on the website, and a
 * "check again" for after the founder deploys it. Visits only count once it is found.
 */
function OwnerCheck({
  startupId,
  host,
  verified,
  onChecked,
}: {
  startupId: number;
  host: string | null;
  verified: boolean;
  onChecked?: (verified: boolean) => void;
}) {
  const t = useTranslations("Sources");
  const errorText = useErrorText();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const site = host ?? "";

  async function recheck() {
    setBusy(true);
    try {
      const res = await fetch(`/api/startups/${startupId}/sources/jaopor`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const body = (await res.json().catch(() => ({}))) as {
        ownerVerified?: boolean;
        error?: string;
        detail?: string;
      };
      if (res.ok) {
        onChecked?.(!!body.ownerVerified);
        if (body.ownerVerified) toast.success(t("jaopor.ownerFoundToast"));
        else toast.info(t("jaopor.stillMissing", { host: site }));
        router.refresh();
      } else
        toast.error(errorText(body.error ?? "server", "jaopor", body.detail));
    } catch {
      toast.error(errorText("server", "jaopor"));
    } finally {
      setBusy(false);
    }
  }

  if (verified)
    return (
      <p className="flex items-start gap-2 text-caption text-positive">
        <ShieldCheckIcon className="mt-px size-4 shrink-0" aria-hidden="true" />
        {t("jaopor.ownerFound", { host: site })}
      </p>
    );
  return (
    <div className="space-y-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-caption">
      <p>{t("jaopor.ownerMissing", { host: site, headTag: "</head>" })}</p>
      <p className="text-muted-foreground">{t("jaopor.causes")}</p>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={busy}
        onClick={recheck}
        className="px-3"
      >
        {busy ? t("verifying") : t("jaopor.recheck")}
      </Button>
    </div>
  );
}

function ConnectedRow({
  startupId,
  connection,
  websiteHost,
}: {
  startupId: number;
  connection: ConnectionInfo;
  websiteHost: string | null;
}) {
  const t = useTranslations("Sources");
  const errorText = useErrorText();
  const format = useFormatter();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const { source } = connection;
  const url = `/api/startups/${startupId}/sources/${source}`;
  const [confirm, confirmDialog] = useConfirm();

  async function act(method: "PATCH" | "DELETE") {
    if (
      method === "DELETE" &&
      !(await confirm({
        title: t("disconnectConfirm", { source: SOURCE_NAME[source] }),
        confirmLabel: t("disconnect"),
        destructive: true,
      }))
    )
      return;
    setBusy(true);
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    const body = (await res.json().catch(() => ({}))) as {
      error?: string;
      detail?: string;
    };
    setBusy(false);
    if (res.ok) {
      toast.success(method === "PATCH" ? t("refreshed") : t("disconnected"));
      router.refresh();
    } else toast.error(errorText(body.error ?? "server", source, body.detail));
  }

  if (source === "jaopor") {
    const waiting = connection.status === "pending";
    return (
      <div className="space-y-3 rounded-md bg-muted/40 p-3 text-sm">
        {confirmDialog}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p
            className={cn(
              "flex items-center gap-2",
              waiting ? "text-muted-foreground" : "text-positive",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "size-2 rounded-full",
                waiting ? "animate-pulse bg-muted-foreground" : "bg-positive",
              )}
            />
            {waiting
              ? t("jaopor.waiting")
              : t("jaopor.since", {
                  date: connection.since
                    ? format.dateTime(new Date(connection.since), {
                        dateStyle: "medium",
                      })
                    : "—",
                })}
          </p>
          <div className="flex gap-3 text-xs">
            {!waiting && (
              <button
                type="button"
                disabled={busy}
                onClick={() => act("PATCH")}
                className="font-medium text-muted-foreground hover:text-foreground"
              >
                {t("refresh")}
              </button>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={() => act("DELETE")}
              className="font-medium text-muted-foreground hover:text-destructive"
            >
              {t("disconnect")}
            </button>
          </div>
        </div>
        <OwnerCheck
          startupId={startupId}
          host={websiteHost}
          verified={!!connection.ownerVerified}
        />
        <SnippetBox projectId={startupId} />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-muted/40 p-3 text-sm">
      {confirmDialog}
      <div className="min-w-0 space-y-0.5">
        <p
          className={
            connection.status === "error" ? "text-destructive" : "text-positive"
          }
        >
          {connection.status === "error" ? "!" : "✓"} {SOURCE_NAME[source]} ·{" "}
          {t("connected")}
        </p>
        {connection.label && (
          <p className="truncate font-mono text-xs text-muted-foreground">
            {connection.label}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          {connection.lastSyncedAt
            ? t("lastSync", {
                time: format.relativeTime(new Date(connection.lastSyncedAt)),
              })
            : t("neverSynced")}
        </p>
        {connection.lastError && (
          <p className="text-xs text-warning">{connection.lastError}</p>
        )}
      </div>
      <div className="flex gap-3 text-xs">
        <button
          type="button"
          disabled={busy}
          onClick={() => act("PATCH")}
          className="font-medium text-muted-foreground hover:text-foreground"
        >
          {t("refresh")}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => act("DELETE")}
          className="font-medium text-muted-foreground hover:text-destructive"
        >
          {t("disconnect")}
        </button>
      </div>
    </div>
  );
}
