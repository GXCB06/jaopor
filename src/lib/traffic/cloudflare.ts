// Cloudflare Web Analytics (free RUM beacon) through the GraphQL Analytics API.
// Credential: an API token with ONLY "Account · Account Analytics · Read". Read-only proof: the
// token must be active and must NOT reach anything outside analytics (zones, Workers, account
// settings); any unexpected answer fails closed. Belongs-to-project proof: the query is filtered
// to the project's own host, so only that site's numbers can ever be read.
// Cloudflare reports *visits* (sessions), not unique visitors; the UI labels them so.
import { ProviderError } from "@/lib/revenue/types";
import { bareDomain, daysAgo, isoDay, type TrafficReading } from "./types";

const API = "https://api.cloudflare.com/client/v4";
const TOKEN_FORMAT = /^[A-Za-z0-9_-]{30,80}$/;
const ACCOUNT_FORMAT = /^[a-f0-9]{32}$/;
const HOST_FORMAT = /^[a-z0-9.-]{1,253}$/;

type Fetch = typeof fetch;
type Envelope<T> = {
  success?: boolean;
  result?: T;
  errors?: Array<{ code?: number; message?: string }>;
};

function call(
  fetchImpl: Fetch,
  token: string,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  return fetchImpl(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    signal: AbortSignal.timeout(15_000),
  });
}

async function envelope<T>(res: Response): Promise<Envelope<T>> {
  try {
    return (await res.json()) as Envelope<T>;
  } catch {
    return {};
  }
}

export function checkCloudflareInput(token: string, accountId: string) {
  if (!TOKEN_FORMAT.test(token))
    throw new ProviderError(
      "invalid_key",
      "Paste a Cloudflare API token (not the Global API Key).",
    );
  if (!ACCOUNT_FORMAT.test(accountId))
    throw new ProviderError(
      "not_found",
      "Paste your Cloudflare Account ID (32 characters, on the account's overview page).",
    );
}

/**
 * Active token that can read analytics and nothing else we can detect. Probes are GET only.
 * A probe that SUCCEEDS means the token reaches beyond analytics → refuse it.
 */
export async function validateCloudflareToken(
  token: string,
  accountId: string,
  fetchImpl: Fetch = fetch,
): Promise<void> {
  checkCloudflareInput(token, accountId);

  // 1. Token is valid and active (user-owned tokens, then account-owned tokens).
  let verify = await call(fetchImpl, token, "/user/tokens/verify");
  if (verify.status === 401 || verify.status === 403)
    verify = await call(
      fetchImpl,
      token,
      `/accounts/${accountId}/tokens/verify`,
    );
  if (verify.status === 429)
    throw new ProviderError("rate_limited", "Cloudflare is rate-limiting us.");
  if (verify.status === 401 || verify.status === 403)
    throw new ProviderError("invalid_key", "Cloudflare rejected this token.");
  if (!verify.ok)
    throw new ProviderError(
      "upstream",
      `Cloudflare responded with HTTP ${verify.status}.`,
    );
  const v = await envelope<{ status?: string }>(verify);
  if (v.result?.status !== "active")
    throw new ProviderError(
      "invalid_key",
      "This token is not active (expired or disabled).",
    );

  // 2. Least privilege: none of these may succeed.
  const beyond: string[] = [];
  const zones = await call(fetchImpl, token, "/zones?per_page=1");
  if (zones.ok) {
    const z = await envelope<unknown[]>(zones);
    if (!Array.isArray(z.result)) fail("zones");
    if (z.result.length > 0) beyond.push("Zones");
  } else if (!denied(zones.status)) fail("zones", zones.status);

  for (const [label, path] of [
    ["Workers", `/accounts/${accountId}/workers/scripts`],
    ["Account settings", `/accounts/${accountId}/rum/site_info/list`],
  ] as const) {
    const res = await call(fetchImpl, token, path);
    if (res.ok) beyond.push(label);
    else if (!denied(res.status)) fail(label, res.status);
  }
  if (beyond.length)
    throw new ProviderError(
      "not_read_only",
      "This token can do more than read analytics. Create a token with only Account Analytics: Read.",
      beyond.join(", "),
    );
}

const denied = (status: number) =>
  status === 401 || status === 403 || status === 404;

function fail(what: string, status?: number): never {
  // Unexpected answer to a probe: never store a token we couldn't classify.
  throw new ProviderError(
    "upstream",
    `Cloudflare gave an unexpected answer while checking the token (${what}${status ? ` HTTP ${status}` : ""}). Please try again.`,
  );
}

type GraphqlBody = {
  data?: {
    viewer?: {
      accounts?: Array<{
        rumPageloadEventsAdaptiveGroups?: Array<{
          sum?: { visits?: number };
          dimensions?: { date?: string };
        }>;
      }>;
    };
  };
  errors?: Array<{ message?: string }> | null;
};

/** Daily visits for the project's host (and its www.) over the last 60 whole UTC days. */
export async function fetchCloudflareTraffic(
  token: string,
  accountId: string,
  websiteHost: string,
  now = new Date(),
  fetchImpl: Fetch = fetch,
): Promise<TrafficReading> {
  checkCloudflareInput(token, accountId);
  const host = bareDomain(websiteHost);
  if (!HOST_FORMAT.test(host))
    throw new ProviderError("no_website", "The website link is not valid.");

  const from = `${isoDay(daysAgo(now, 60))}T00:00:00Z`;
  const to = `${isoDay(now)}T00:00:00Z`;
  // Values are validated above (hex id, plain hostname), then JSON-encoded into the query.
  const query = `{ viewer { accounts(filter: { accountTag: ${JSON.stringify(accountId)} }) {
    rumPageloadEventsAdaptiveGroups(limit: 100, orderBy: [date_ASC], filter: {
      datetime_geq: ${JSON.stringify(from)}, datetime_lt: ${JSON.stringify(to)},
      requestHost_in: ${JSON.stringify([host, `www.${host}`])}
    }) { sum { visits } dimensions { date } }
  } } }`;

  const res = await call(fetchImpl, token, "/graphql", {
    method: "POST",
    body: JSON.stringify({ query }),
  });
  if (res.status === 429)
    throw new ProviderError("rate_limited", "Cloudflare is rate-limiting us.");
  if (res.status === 401 || res.status === 403)
    throw new ProviderError("invalid_key", "Cloudflare rejected this token.");
  if (!res.ok)
    throw new ProviderError(
      "upstream",
      `Cloudflare responded with HTTP ${res.status}.`,
    );
  const body = (await res.json()) as GraphqlBody;
  if (body.errors?.length) {
    const msg = body.errors.map((e) => e.message ?? "").join(" ");
    throw new ProviderError(
      /authoriz|permission|access/i.test(msg)
        ? "missing_permission"
        : "upstream",
      /authoriz|permission|access/i.test(msg)
        ? "This token can't read Web Analytics. Give it Account Analytics: Read for this account."
        : "Cloudflare could not run the analytics query.",
    );
  }
  const rows =
    body.data?.viewer?.accounts?.[0]?.rumPageloadEventsAdaptiveGroups ?? [];
  const daily = rows
    .map((r) => ({
      day: String(r.dimensions?.date ?? "").slice(0, 10),
      visitors: Math.max(0, Math.round(r.sum?.visits ?? 0)),
    }))
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d.day));
  if (!daily.length)
    throw new ProviderError(
      "domain_mismatch",
      `No Web Analytics data for ${host} in this Cloudflare account yet. Add the site in Cloudflare → Web Analytics, wait for the first visits, then try again.`,
      host,
    );

  const cut = isoDay(daysAgo(now, 30));
  const sum = (xs: typeof daily) => xs.reduce((a, d) => a + d.visitors, 0);
  return {
    visitors30d: sum(daily.filter((d) => d.day >= cut)),
    visitorsPrev30d: sum(daily.filter((d) => d.day < cut)),
    daily: daily.filter((d) => d.day >= cut),
    domain: host,
  };
}
