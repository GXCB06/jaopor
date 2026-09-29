// Plausible Stats API v2 (POST /api/v2/query). Stats API keys are read-only by design; we also
// refuse keys that can use the Sites API (which can create/delete sites).
import { ProviderError } from "@/lib/revenue/types";
import { daysAgo, isoDay, type TrafficReading } from "./types";

const BASE = "https://plausible.io";
const KEY_FORMAT = /^[A-Za-z0-9_-]{20,200}$/;

type Fetch = typeof fetch;
type QueryResult = {
  results?: Array<{ dimensions?: string[]; metrics?: number[] }>;
};

function fail(res: Response, body: string): never {
  if (res.status === 401)
    throw new ProviderError("invalid_key", "Plausible rejected this API key.");
  if (res.status === 429)
    throw new ProviderError("rate_limited", "Plausible is rate-limiting us.");
  if (res.status === 400 || res.status === 404 || res.status === 403)
    // Plausible answers 400 "site not found / no access" for sites outside the key's team.
    throw new ProviderError(
      "not_found",
      /site/i.test(body)
        ? "This key can't see that site. Check the domain as it appears in Plausible."
        : "Plausible could not run the query for this site.",
    );
  throw new ProviderError(
    "upstream",
    `Plausible responded with HTTP ${res.status}.`,
  );
}

async function query(
  fetchImpl: Fetch,
  key: string,
  body: object,
): Promise<QueryResult> {
  const res = await fetchImpl(`${BASE}/api/v2/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) fail(res, await res.text().catch(() => ""));
  return (await res.json()) as QueryResult;
}

export async function validatePlausibleKey(
  key: string,
  fetchImpl: Fetch = fetch,
): Promise<void> {
  if (!KEY_FORMAT.test(key))
    throw new ProviderError("invalid_key", "Paste a Plausible Stats API key.");
  // A Sites API key can list (and create/delete) sites. A Stats API key gets 401/403 here.
  const sites = await fetchImpl(`${BASE}/api/v1/sites`, {
    headers: { Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(15_000),
  });
  if (sites.ok)
    throw new ProviderError(
      "not_read_only",
      "This is a Sites API key (it can change sites). Create a Stats API key instead.",
      "Sites API",
    );
}

export async function fetchPlausibleTraffic(
  key: string,
  siteId: string,
  now = new Date(),
  fetchImpl: Fetch = fetch,
): Promise<TrafficReading> {
  const yesterday = daysAgo(now, 1);
  const range = (from: Date, to: Date) => [isoDay(from), isoDay(to)];
  const [daily, prev] = await Promise.all([
    query(fetchImpl, key, {
      site_id: siteId,
      metrics: ["visitors"],
      date_range: range(daysAgo(now, 30), yesterday),
      dimensions: ["time:day"],
    }),
    query(fetchImpl, key, {
      site_id: siteId,
      metrics: ["visitors"],
      date_range: range(daysAgo(now, 60), daysAgo(now, 31)),
    }),
  ]);
  // Unique visitors over the whole window (not the sum of daily uniques).
  const total = await query(fetchImpl, key, {
    site_id: siteId,
    metrics: ["visitors"],
    date_range: range(daysAgo(now, 30), yesterday),
  });

  const num = (r: QueryResult) =>
    Math.max(0, r.results?.[0]?.metrics?.[0] ?? 0);
  return {
    visitors30d: num(total),
    visitorsPrev30d: num(prev),
    daily: (daily.results ?? [])
      .map((r) => ({
        day: String(r.dimensions?.[0] ?? "").slice(0, 10),
        visitors: Math.max(0, r.metrics?.[0] ?? 0),
      }))
      .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d.day)),
    domain: siteId,
  };
}
