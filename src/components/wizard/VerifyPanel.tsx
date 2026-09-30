"use client";

import { CheckIcon, CopyIcon, ExternalLinkIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
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
