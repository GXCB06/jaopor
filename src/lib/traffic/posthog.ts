// PostHog Web Analytics via a read-only personal API key (owner decision 2026-10-15).
// Ownership is proved two ways, never by the public project token (phc_…): the key must be
// read-only (a write probe must be refused) AND the project's authorized URL (`app_urls`) must be
// the project's own website — the same belongs-to-project rule GA4 and Plausible use.
// Visitors = PostHog "visitors" (unique people) over the lookback window, counted, not audited.
import { ProviderError } from "@/lib/revenue/types";
import { domainMatches, type TrafficReading } from "./types";

type Fetch = typeof fetch;

/** PostHog is region-split and the key only works against its own host. Allow-list, no SSRF surface. */
const HOSTS = new Set(["https://us.posthog.com", "https://eu.posthog.com"]);
const KEY_FORMAT = /^phx_[A-Za-z0-9]{20,300}$/;
const PROJECT_FORMAT = /^\d{1,12}$/;
const WINDOW_DAYS = 30;

/** "us" · "us.posthog.com" · "https://eu.posthog.com" → an allow-listed origin (or throws). */
export function posthogHost(input: string | undefined): string {
  const v = (input ?? "").trim().toLowerCase().replace(/\/+$/, "");
  if (
    !v ||
    v === "us" ||
    v === "us.posthog.com" ||
    v === "https://us.posthog.com"
  )
    return "https://us.posthog.com";
  if (v === "eu" || v === "eu.posthog.com" || v === "https://eu.posthog.com")
    return "https://eu.posthog.com";
  const origin = (() => {
    try {
      return new URL(v.includes("://") ? v : `https://${v}`).origin;
    } catch {
      return null;
    }
  })();
  if (!origin || !HOSTS.has(origin))
    throw new ProviderError(
      "invalid_key",
      "Use the US (us.posthog.com) or EU (eu.posthog.com) PostHog host.",
    );
  return origin;
}

function fail(res: Response, what: string): never {
  if (res.status === 401 || res.status === 403)
    throw new ProviderError(
      "invalid_key",
      "PostHog rejected this API key (or it lacks the read scope).",
    );
  if (res.status === 404)
    throw new ProviderError(
      "not_found",
      "PostHog can't find that project id, or the key can't see it.",
    );
  if (res.status === 429)
    throw new ProviderError("rate_limited", "PostHog is rate-limiting us.");
  throw new ProviderError(
    "upstream",
    `PostHog responded with HTTP ${res.status} while reading ${what}.`,
  );
}

const auth = (key: string) => ({
  Authorization: `Bearer ${key}`,
  Accept: "application/json",
});

export type PosthogProject = {
  /** Authorized URLs of the project (used to prove it belongs to the project's website). */
  appUrls: string[];
  /** The public ingestion token (phc_…), for display/corroboration only — never an ownership proof. */
  apiToken: string | null;
};

/**
 * Proves the key is read-only AND can read this project, and returns the project's authorized URLs.
 * Fail-closed: a write probe that is NOT refused means the key can write → refuse it (`not_read_only`).
 */
export async function validatePosthogKey(
  key: string,
  projectId: string,
  host: string,
  fetchImpl: Fetch = fetch,
): Promise<PosthogProject> {
  if (!KEY_FORMAT.test(key))
    throw new ProviderError(
      "invalid_key",
      "Paste a PostHog personal API key (starts with phx_), not the public project token.",
    );
  if (!PROJECT_FORMAT.test(projectId))
    throw new ProviderError(
      "not_found",
      "Paste the PostHog Project ID (the number in the project URL).",
    );
  const base = `${host}/api/projects/${projectId}/`;
  const signal = AbortSignal.timeout(15_000);

  const res = await fetchImpl(base, { headers: auth(key), signal });
  if (!res.ok) fail(res, "the project");
  const project = (await res.json().catch(() => ({}))) as {
    app_urls?: unknown;
    api_token?: unknown;
  };
  const appUrls = Array.isArray(project.app_urls)
    ? project.app_urls.filter((u): u is string => typeof u === "string")
    : [];
  const apiToken =
    typeof project.api_token === "string" ? project.api_token : null;

  // Read-only proof: a PATCH that requires project:write must be refused. An empty body is a no-op
  // for a write-capable key, so nothing changes even in the failure case.
  const probe = await fetchImpl(base, {
    method: "PATCH",
    headers: { ...auth(key), "Content-Type": "application/json" },
    body: "{}",
    signal,
  });
  if (probe.ok)
    throw new ProviderError(
      "not_read_only",
      "This PostHog key can write (it changed the project). Create a key with only read scopes.",
      "project:write",
    );
  if (probe.status !== 401 && probe.status !== 403)
    throw new ProviderError(
      "upstream",
      `PostHog gave an unexpected answer while checking the key (HTTP ${probe.status}). Please try again.`,
    );

  return { appUrls, apiToken };
}

/** The project's authorized URL must be the project's own website (or a subdomain). */
export function assertPosthogWebsite(
  appUrls: string[],
  websiteHost: string,
): string {
  const match = appUrls.find((u) => domainMatches(u, websiteHost));
  if (!match)
    throw new ProviderError(
      "domain_mismatch",
      appUrls.length
        ? `This PostHog project is authorized for ${appUrls.join(", ")}, not ${websiteHost}.`
        : "This PostHog project has no authorized URL. Add your website under PostHog → Project settings → Authorized URLs.",
    );
  return match;
}

const n = (v: unknown) => {
  const x = Number(v);
  return Number.isFinite(x) && x >= 0 ? Math.round(x) : 0;
};

const DAY_MS = 86_400_000;

/** 30-day unique visitors and the previous 30 days. Fails closed if the window isn't actually 30d. */
export async function fetchPosthogTraffic(
  key: string,
  projectId: string,
  host: string,
  fetchImpl: Fetch = fetch,
): Promise<TrafficReading> {
  const url = `${host}/api/projects/${projectId}/web_analytics/weekly_digest/?days=${WINDOW_DAYS}&compare=true`;
  const res = await fetchImpl(url, {
    headers: auth(key),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) fail(res, "web analytics");
  const body = (await res.json().catch(() => ({}))) as {
    visitors?: { current?: unknown; previous?: unknown };
    metadata?: {
      date_from?: unknown;
      date_to?: unknown;
      data_status?: unknown;
    };
  };

  // The digest's lookback window is what our 30-day metric claims to be, so verify it. If PostHog
  // ever caps `days` (it is named "weekly"), we refuse rather than store a mislabelled number.
  const from = Date.parse(String(body.metadata?.date_from ?? ""));
  const to = Date.parse(String(body.metadata?.date_to ?? ""));
  if (Number.isFinite(from) && Number.isFinite(to)) {
    const days = (to - from) / DAY_MS;
    if (days < WINDOW_DAYS - 2 || days > WINDOW_DAYS + 2)
      throw new ProviderError(
        "upstream",
        `PostHog returned a ${Math.round(days)}-day window instead of ${WINDOW_DAYS}. We won't store a mislabelled number.`,
      );
  }

  return {
    visitors30d: n(body.visitors?.current),
    visitorsPrev30d: n(body.visitors?.previous),
    // The digest endpoint has no daily series; the chart simply has none for PostHog (v1).
    daily: [],
    domain: null,
  };
}
