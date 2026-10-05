"use client";

import {
  ArrowLeftIcon,
  ChartColumnIcon,
  CheckIcon,
  CopyIcon,
  CreditCardIcon,
  ExternalLinkIcon,
  GitBranchIcon,
  GlobeIcon,
  SmartphoneIcon,
  XIcon,
  type LucideIcon,
} from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Link, useRouter } from "@/i18n/navigation";
import {
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
import { Field, inputClass } from "./fields";

// Design.md §5 VerifyPanel: revenue (Stripe | RevenueCat) · visitors (JaoPor snippet | Plausible |
// Umami | Cloudflare) · build proof (GitHub). Every credential is read-only; the server proves it
// before storing. The snippet needs no credential: a visit from the website activates it.
// While nothing is connected it is a chooser instead ("What do you have?", Design.md §5
// VerifyPanel chooser; first-user test: three groups on one screen made people skip).

export type ConnectionInfo = {
  source: SourceId;
  status: string;
  lastSyncedAt: string | null;
  lastError: string | null;
  /** Non-secret reminder: key hint, analytics domain, project id or repo. */
  label: string | null;
  /** JaoPor snippet: day the first visit arrived (null while waiting). */
  since: string | null;
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
  slug,
  connections,
  websiteHost,
  githubLogin,
  onConnected,
}: {
  startupId: number;
  slug: string;
  connections: ConnectionInfo[];
  websiteHost: string | null;
  githubLogin: string | null;
  onConnected?: (source: SourceId) => void;
}) {
  const t = useTranslations("Sources");
  if (connections.length === 0)
    return (
      <VerifyChooser
        startupId={startupId}
        slug={slug}
        websiteHost={websiteHost}
        githubLogin={githubLogin}
        onConnected={onConnected}
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
          slug={slug}
          connections={connections}
          websiteHost={websiteHost}
          githubLogin={githubLogin}
          onConnected={onConnected}
        />
      ))}
    </div>
  );
}

type Choice = "website" | "stripe" | "revenuecat" | "github" | "analytics";
const ANALYTICS: SourceId[] = ["plausible", "umami", "cloudflare"];

const CHOICES: {
  id: Choice;
  icon: LucideIcon;
  source: SourceId;
  /** Deep-link target from the profile ("#verify-revenue"…): the tile carries the id. */
  anchor: string | null;
  noKey: boolean;
}[] = [
  {
    id: "website",
    icon: GlobeIcon,
    source: "jaopor",
    anchor: "verify-traffic",
    noKey: true,
  },
  {
    id: "stripe",
    icon: CreditCardIcon,
    source: "stripe",
    anchor: "verify-revenue",
    noKey: false,
  },
  {
    id: "revenuecat",
    icon: SmartphoneIcon,
    source: "revenuecat",
    anchor: null,
    noKey: false,
  },
  {
    id: "github",
    icon: GitBranchIcon,
    source: "github",
    anchor: "verify-build",
    noKey: true,
  },
  {
    id: "analytics",
    icon: ChartColumnIcon,
    source: "plausible",
    anchor: null,
    noKey: false,
  },
];

function VerifyChooser({
  startupId,
  slug,
  websiteHost,
  githubLogin,
  onConnected,
}: {
  startupId: number;
  slug: string;
  websiteHost: string | null;
  githubLogin: string | null;
  onConnected?: (source: SourceId) => void;
}) {
  const t = useTranslations("Sources");
  const [choice, setChoice] = useState<Choice | null>(null);
  const [analytics, setAnalytics] = useState<SourceId>("plausible");
  // Sources connected here (the wizard's `connections` never refreshes).
  const [done, setDone] = useState<SourceId[]>([]);

  // The snippet needs a website; without one, analytics takes its deep-link anchor.
  const choices = CHOICES.filter((c) => c.id !== "website" || websiteHost).map(
    (c) =>
      c.id === "analytics" && !websiteHost
        ? { ...c, anchor: "verify-traffic" }
        : c,
  );
  const current = choices.find((c) => c.id === choice);
  const source =
    current?.id === "analytics" ? analytics : (current?.source ?? null);
  const doneOf = (c: (typeof choices)[number]) =>
    c.id === "analytics"
      ? ANALYTICS.some((s) => done.includes(s))
      : done.includes(c.source);

  if (!current || !source)
    return (
      <div id="verify" className="scroll-mt-24 space-y-3">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold">{t("choose.title")}</h3>
          <p className="text-caption text-muted-foreground">
            {t("choose.hint")}
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {choices.map((c) => {
            const Icon = c.icon;
            const isDone = doneOf(c);
            return (
              <button
                key={c.id}
                id={c.anchor ?? undefined}
                type="button"
                onClick={() => setChoice(c.id)}
                className="flex scroll-mt-24 items-start gap-3 rounded-xl border bg-card p-3 text-left transition-colors hover:bg-accent"
              >
                <Icon
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 space-y-0.5">
                  <span className="block text-sm font-semibold">
                    {t(`choose.${c.id}`)}
                  </span>
                  <span className="block text-caption text-muted-foreground">
                    {t(`choose.${c.id}Hint`)}
                  </span>
                </span>
                <span
                  className={cn(
                    "shrink-0 rounded-full border px-2 py-0.5 text-2xs",
                    isDone || c.noKey
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
                  ) : c.noKey ? (
                    t("choose.noKey")
                  ) : (
                    t("choose.readKey")
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );

  const replaces =
    done.find((s) => s !== source && SOURCE_KIND[s] === SOURCE_KIND[source]) ??
    null;
  const connected = done.includes(source);

  return (
    <div id="verify" className="scroll-mt-24 space-y-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <button
          type="button"
          onClick={() => setChoice(null)}
          className="inline-flex items-center gap-1 text-caption text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-3.5" aria-hidden="true" />
          {t("choose.change")}
        </button>
        <h3 className="text-sm font-semibold">{t(`choose.${current.id}`)}</h3>
      </div>
      <section className="space-y-3 rounded-lg border p-4">
        {current.id === "analytics" && (
          <div
            className="flex flex-wrap gap-1.5"
            role="group"
            aria-label={t("choose.analytics")}
          >
            {ANALYTICS.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={s === analytics}
                onClick={() => setAnalytics(s)}
                className={cn(
                  "rounded-md border px-3 py-1 text-xs transition-colors",
                  s === analytics
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {SOURCE_NAME[s]}
              </button>
            ))}
          </div>
        )}
        {connected ? (
          <div className="space-y-3">
            <p className="flex items-center gap-2 text-sm text-positive">
              <CheckIcon className="size-4" aria-hidden="true" />
              {source === "jaopor"
                ? t("jaopor.waiting")
                : `${SOURCE_NAME[source]} · ${t("connected")}`}
            </p>
            {source === "jaopor" && <SnippetBox slug={slug} />}
          </div>
        ) : (
          <SourceForm
            key={source}
            source={source}
            startupId={startupId}
            slug={slug}
            replaces={replaces}
            websiteHost={websiteHost}
            githubLogin={githubLogin}
            onConnected={(s) => {
              setDone((d) => [
                ...d.filter((x) => SOURCE_KIND[x] !== SOURCE_KIND[s]),
                s,
              ]);
              onConnected?.(s);
            }}
          />
        )}
      </section>
      {connected && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="px-3"
          onClick={() => setChoice(null)}
        >
          {t("choose.addAnother")}
        </Button>
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
  slug,
  connections,
  websiteHost,
  githubLogin,
  onConnected,
}: {
  kind: SourceKind;
  startupId: number;
  slug: string;
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
          slug={slug}
          connection={connection}
        />
      ) : (
        <SourceForm
          key={selected}
          source={selected}
          startupId={startupId}
          slug={slug}
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
  slug,
  replaces,
  websiteHost,
  githubLogin,
  onConnected,
}: {
  source: SourceId;
  startupId: number;
  slug: string;
  replaces: SourceId | null;
  websiteHost: string | null;
  githubLogin: string | null;
  onConnected?: (source: SourceId) => void;
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
      };
      if (res.ok && body.ok) {
        toast.success(t("success"));
        onConnected?.(source);
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
          <li key={i}>{t(`${source}.howTo${i + 1}` as "stripe.howTo1")}</li>
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
        <p className="text-sm text-muted-foreground">
          {t("github.needGithub")}
        </p>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          {source === "jaopor" && <SnippetBox slug={slug} />}
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

/** Design.md §5 VerifyPanel snippet: the one line founders paste before </head>. */
function SnippetBox({ slug }: { slug: string }) {
  const t = useTranslations("Sources");
  const code = `<script defer src="${publicEnv.siteUrl}/v.js" data-project="${slug}"></script>`;
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
    </div>
  );
}

function ConnectedRow({
  startupId,
  slug,
  connection,
}: {
  startupId: number;
  slug: string;
  connection: ConnectionInfo;
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
        <SnippetBox slug={slug} />
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
