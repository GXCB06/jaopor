// RevenueCat connector (API v2). Mobile apps' best single source: iOS + Android + web subscriptions.
// RevenueCat already aggregates (MRR, revenue per date range, active users), so this connector
// returns finished numbers instead of feeding charges into the metrics engine.
//
// Read-only proof: v2 secret keys have per-area permissions (none / read / read & write). We need
// only "Charts & metrics: read". The key must get 403 on a Customer-information read and on a
// Project-configuration read: without read there is no write, and we never see customer data.
// Any other answer to those probes fails closed.
import { ProviderError } from "../types";

const API = "https://api.revenuecat.com/v2";
const KEY_FORMAT = /^sk_[A-Za-z0-9]{16,}$/;
const PROJECT_FORMAT = /^[A-Za-z0-9_-]{4,64}$/;

type Fetch = typeof fetch;

export type RevenueCatMetrics = {
  mrrCents: number;
  revenue30dCents: number;
  revenuePrev30dCents: number;
  revenueAllTimeCents: number | null;
  /** Revenue of the last full UTC day, for the daily snapshot (the chart fills in over time). */
  revenueYesterdayCents: number;
  activeSubscriptions: number | null;
  activeUsers: number | null;
};

type OverviewMetric = { id?: string; value?: number | string | null };

const WRITE_PROBES = [
  { path: "customers?limit=1", area: "Customer information" },
  { path: "apps?limit=1", area: "Project configuration" },
];

async function call(
  fetchImpl: Fetch,
  key: string,
  url: string,
): Promise<Response> {
  return fetchImpl(url, {
    headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
}

function fail(res: Response): never {
  if (res.status === 401)
    throw new ProviderError(
      "invalid_key",
      "RevenueCat rejected this key (revoked or not a v2 secret key).",
    );
  if (res.status === 403)
    throw new ProviderError(
      "missing_permission",
      "The key needs Charts & metrics → Read.",
    );
  if (res.status === 404)
    throw new ProviderError(
      "not_found",
      "RevenueCat project not found. Check the project ID.",
    );
  if (res.status === 429)
    throw new ProviderError("rate_limited", "RevenueCat is rate-limiting us.");
  throw new ProviderError(
    "upstream",
    `RevenueCat responded with HTTP ${res.status}.`,
  );
}

function projectUrl(projectId: string, path: string) {
  return `${API}/projects/${encodeURIComponent(projectId)}/${path}`;
}

export async function validateRevenueCatKey(
  key: string,
  projectId: string,
  fetchImpl: Fetch = fetch,
): Promise<void> {
  if (!KEY_FORMAT.test(key))
    throw new ProviderError(
      "invalid_key",
      "Paste a RevenueCat v2 secret key (starts with sk_).",
    );
  if (!PROJECT_FORMAT.test(projectId))
    throw new ProviderError("not_found", "Check the RevenueCat project ID.");

  const overview = await call(
    fetchImpl,
    key,
    projectUrl(projectId, "metrics/overview?currency=USD"),
  );
  if (!overview.ok) fail(overview);

  const writable: string[] = [];
  for (const probe of WRITE_PROBES) {
    const res = await call(fetchImpl, key, projectUrl(projectId, probe.path));
    if (res.status === 403) continue;
    if (res.ok) {
      writable.push(probe.area);
      continue;
    }
    fail(res);
  }
  if (writable.length)
    throw new ProviderError(
      "not_read_only",
      "This key can access more than charts. Set every area except Charts & metrics to No access.",
      writable.join(", "),
    );
}

const toCents = (v: unknown): number | null => {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) && n >= 0
    ? Math.round(n * 100)
    : null;
};
const toCount = (v: unknown): number | null => {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) && n >= 0
    ? Math.round(n)
    : null;
};
const isoDay = (d: Date) => d.toISOString().slice(0, 10);
const daysAgo = (now: Date, n: number) =>
  new Date(now.getTime() - n * 86_400_000);

async function revenueBetween(
  fetchImpl: Fetch,
  key: string,
  projectId: string,
  start: Date,
  end: Date,
): Promise<number | null> {
  const res = await call(
    fetchImpl,
    key,
    projectUrl(
      projectId,
      `metrics/revenue?start_date=${isoDay(start)}&end_date=${isoDay(end)}&currency=USD`,
    ),
  );
  if (!res.ok) fail(res);
  const body = (await res.json()) as { value?: unknown };
  return toCents(body.value);
}

/** Pulls the numbers we show. Dates are whole UTC days; "30 days" = the 30 days before today. */
export async function fetchRevenueCatMetrics(
  key: string,
  projectId: string,
  now = new Date(),
  fetchImpl: Fetch = fetch,
): Promise<RevenueCatMetrics> {
  const res = await call(
    fetchImpl,
    key,
    projectUrl(projectId, "metrics/overview?currency=USD"),
  );
  if (!res.ok) fail(res);
  const { metrics = [] } = (await res.json()) as { metrics?: OverviewMetric[] };
  const metric = (id: string) => metrics.find((m) => m.id === id)?.value;

  const yesterday = daysAgo(now, 1);
  const [last30, prev30, allTime, dayBefore] = await Promise.all([
    revenueBetween(fetchImpl, key, projectId, daysAgo(now, 30), yesterday),
    revenueBetween(
      fetchImpl,
      key,
      projectId,
      daysAgo(now, 60),
      daysAgo(now, 31),
    ),
    // RevenueCat launched in 2017; nothing can be older.
    revenueBetween(
      fetchImpl,
      key,
      projectId,
      new Date("2017-01-01"),
      yesterday,
    ).catch(() => null),
    revenueBetween(fetchImpl, key, projectId, yesterday, yesterday),
  ]);

  return {
    mrrCents: toCents(metric("mrr")) ?? 0,
    revenue30dCents: last30 ?? 0,
    revenuePrev30dCents: prev30 ?? 0,
    revenueAllTimeCents: allTime,
    revenueYesterdayCents: dayBefore ?? 0,
    activeSubscriptions: toCount(metric("active_subscriptions")),
    activeUsers: toCount(metric("active_users")),
  };
}
