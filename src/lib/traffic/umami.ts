// Umami (Cloud or self-hosted) via a public SHARE link: a view-only token, so it cannot write
// and never exposes the account. Flow (from Umami's source, src/app/api/share/[slug]/route.ts):
//   GET {base}/api/share/{slug}              → { websiteId, token }
//   GET {base}/api/websites/{id}             → { domain }            header x-umami-share-token
//   GET {base}/api/websites/{id}/stats       → visitors (+ comparison)
//   GET {base}/api/websites/{id}/pageviews   → sessions per day
// The share URL is user-supplied → every request goes through the SSRF guard (fetchPublic).
import { ProviderError } from "@/lib/revenue/types";
import { daysAgo, type TrafficReading } from "./types";

type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

const SHARE_PATH = /^(.*?)\/share\/([A-Za-z0-9]{8,50})(?:\/.*)?$/;

/** "https://cloud.umami.is/share/AbC123xyz/site.com" → { apiBase, slug }. */
export function parseUmamiShareUrl(
  input: string,
): { apiBase: string; slug: string } | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  const m = SHARE_PATH.exec(url.pathname);
  if (!m) return null;
  return { apiBase: `${url.origin}${m[1]}/api`, slug: m[2] };
}

function fail(res: Response): never {
  if (res.status === 404)
    throw new ProviderError(
      "not_found",
      "Umami share link not found. Turn on sharing and copy the link again.",
    );
  if (res.status === 401 || res.status === 403)
    throw new ProviderError(
      "invalid_key",
      "Umami refused the share link (sharing turned off?).",
    );
  if (res.status === 429)
    throw new ProviderError("rate_limited", "Umami is rate-limiting us.");
  throw new ProviderError(
    "upstream",
    `Umami responded with HTTP ${res.status}.`,
  );
}

async function getJson<T>(
  fetchImpl: Fetch,
  url: string,
  token?: string,
): Promise<T> {
  let res: Response;
  try {
    res = await fetchImpl(url, {
      headers: {
        Accept: "application/json",
        ...(token ? { "x-umami-share-token": token } : {}),
      },
    });
  } catch {
    throw new ProviderError(
      "upstream",
      "Could not reach that Umami server (it must be public https).",
    );
  }
  if (!res.ok) fail(res);
  return (await res.json()) as T;
}

/** Umami v2 returns { visitors: { value } }, v3 returns { visitors: n }. */
const count = (v: unknown): number => {
  const n =
    typeof v === "number"
      ? v
      : typeof v === "object" && v !== null && "value" in v
        ? Number((v as { value: unknown }).value)
        : NaN;
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : 0;
};

export async function fetchUmamiTraffic(
  shareUrl: string,
  fetchImpl: Fetch,
  now = new Date(),
): Promise<TrafficReading> {
  const parsed = parseUmamiShareUrl(shareUrl);
  if (!parsed)
    throw new ProviderError(
      "invalid_key",
      "Paste the Umami share link (…/share/…).",
    );
  const { apiBase, slug } = parsed;

  const share = await getJson<{ websiteId?: string; token?: string }>(
    fetchImpl,
    `${apiBase}/share/${slug}`,
  );
  if (!share.websiteId || !share.token)
    throw new ProviderError(
      "not_found",
      "That Umami link is not a website share.",
    );
  const site = `${apiBase}/websites/${encodeURIComponent(share.websiteId)}`;

  const end = daysAgo(now, 0);
  end.setUTCHours(0, 0, 0, 0); // today 00:00 UTC → window = the 30 whole days before today
  const endAt = end.getTime() - 1;
  const startAt = daysAgo(end, 30).getTime();

  const [website, stats, series] = await Promise.all([
    getJson<{ domain?: string | null }>(fetchImpl, site, share.token),
    getJson<Record<string, unknown> & { comparison?: Record<string, unknown> }>(
      fetchImpl,
      `${site}/stats?startAt=${startAt}&endAt=${endAt}`,
      share.token,
    ),
    getJson<{ sessions?: Array<{ x?: string; y?: number }> }>(
      fetchImpl,
      `${site}/pageviews?startAt=${startAt}&endAt=${endAt}&unit=day&timezone=UTC`,
      share.token,
    ),
  ]);

  const prevFromV2 =
    typeof stats.visitors === "object" && stats.visitors !== null
      ? (stats.visitors as { prev?: unknown }).prev
      : undefined;

  return {
    visitors30d: count(stats.visitors),
    visitorsPrev30d: count(stats.comparison?.visitors ?? prevFromV2),
    daily: (series.sessions ?? [])
      .map((p) => ({
        day: String(p.x ?? "").slice(0, 10),
        visitors: count(p.y),
      }))
      .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d.day)),
    domain: website.domain ?? null,
  };
}
