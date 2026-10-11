// Google Analytics 4 (owner decision 2026-10-11): the founder adds JaoPor's service-account email
// as a **Viewer** on their GA4 property and gives us the Property ID. Founders hand us no secret.
// Read-only by construction: every token we mint carries only the `analytics.readonly` scope,
// so Google refuses any write even if a founder grants more than Viewer.
// Ownership: one of the property's web streams must point at the project's website.
// Visitors = GA4 "Total users" (unique users) — counted, not verified (Design.md §3).
import { createSign } from "node:crypto";
import { ProviderError } from "@/lib/revenue/types";
import { daysAgo, domainMatches, isoDay, type TrafficReading } from "./types";

type Fetch = typeof fetch;

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const ADMIN = "https://analyticsadmin.googleapis.com/v1beta";
const DATA = "https://analyticsdata.googleapis.com/v1beta";
const SCOPE = "https://www.googleapis.com/auth/analytics.readonly";

export type Ga4Credentials = { clientEmail: string; privateKey: string };

/** The service account JSON from the server env, or null when GA4 isn't set up. */
export function parseServiceAccount(
  json: string | undefined,
): Ga4Credentials | null {
  if (!json) return null;
  try {
    const v = JSON.parse(json) as {
      client_email?: unknown;
      private_key?: unknown;
    };
    if (typeof v.client_email !== "string" || typeof v.private_key !== "string")
      return null;
    return { clientEmail: v.client_email, privateKey: v.private_key };
  } catch {
    return null;
  }
}

/** "123456789", "properties/123456789" or a GA URL containing "p123456789" → "123456789". */
export function parsePropertyId(input: string): string | null {
  const v = input.trim();
  const m =
    /^(?:properties\/)?(\d{6,12})$/.exec(v) ??
    /[/#]p(\d{6,12})(?:[/?#]|$)/.exec(v);
  return m ? m[1] : null;
}

const b64url = (s: string | Buffer) =>
  Buffer.from(s)
    .toString("base64")
    .replace(/=+$/, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

let cached: { email: string; token: string; until: number } | null = null;

/** A read-only access token for JaoPor's service account (JWT bearer grant, cached ~50 min). */
export async function ga4AccessToken(
  creds: Ga4Credentials,
  fetchImpl: Fetch = fetch,
  now = Date.now(),
): Promise<string> {
  if (cached && cached.email === creds.clientEmail && cached.until > now)
    return cached.token;
  const iat = Math.floor(now / 1000);
  const head = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(
    JSON.stringify({
      iss: creds.clientEmail,
      scope: SCOPE,
      aud: TOKEN_URL,
      iat,
      exp: iat + 3600,
    }),
  );
  let signature: string;
  try {
    signature = b64url(
      createSign("RSA-SHA256")
        .update(`${head}.${claims}`)
        .sign(creds.privateKey),
    );
  } catch {
    throw new ProviderError(
      "upstream",
      "Google Analytics isn't set up on JaoPor yet.",
    );
  }
  const res = await fetchImpl(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${head}.${claims}.${signature}`,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok)
    // Our own credentials were refused: not the founder's fault, and never their key.
    throw new ProviderError(
      "upstream",
      "Google refused JaoPor's Analytics access.",
    );
  const body = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
  };
  if (!body.access_token)
    throw new ProviderError("upstream", "Google returned no access token.");
  cached = {
    email: creds.clientEmail,
    token: body.access_token,
    until: now + Math.min(body.expires_in ?? 3600, 3600) * 1000 - 10 * 60_000,
  };
  return body.access_token;
}

/** Test seam. */
export function resetGa4TokenCache() {
  cached = null;
}

async function call<T>(
  fetchImpl: Fetch,
  token: string,
  url: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetchImpl(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    signal: AbortSignal.timeout(15_000),
  });
  if (res.status === 403 || res.status === 404)
    throw new ProviderError(
      "not_found",
      "JaoPor can't see this GA4 property. Add JaoPor's email as a Viewer, then check the Property ID.",
    );
  if (res.status === 429)
    throw new ProviderError(
      "rate_limited",
      "Google Analytics is rate-limiting us.",
    );
  if (res.status === 400)
    throw new ProviderError(
      "not_found",
      "Google Analytics didn't accept this Property ID.",
    );
  if (!res.ok)
    throw new ProviderError(
      "upstream",
      `Google Analytics responded with HTTP ${res.status}.`,
    );
  return (await res.json()) as T;
}

/**
 * Proves the property belongs to the project: one of its web streams points at the website.
 * Returns the matched stream's domain.
 */
export async function assertGa4Property(
  token: string,
  propertyId: string,
  websiteHost: string,
  fetchImpl: Fetch = fetch,
): Promise<string> {
  const body = await call<{
    dataStreams?: Array<{
      type?: string;
      webStreamData?: { defaultUri?: string };
    }>;
  }>(
    fetchImpl,
    token,
    `${ADMIN}/properties/${propertyId}/dataStreams?pageSize=50`,
  );
  const uris = (body.dataStreams ?? [])
    .filter((s) => s.type === "WEB_DATA_STREAM" && s.webStreamData?.defaultUri)
    .map((s) => s.webStreamData!.defaultUri!);
  const match = uris.find((u) => domainMatches(u, websiteHost));
  if (!match)
    throw new ProviderError(
      "domain_mismatch",
      uris.length
        ? `This GA4 property measures ${uris.join(", ")}, not ${websiteHost}.`
        : "This GA4 property has no web data stream for the website.",
    );
  return match;
}

type Report = {
  rows?: Array<{
    dimensionValues?: Array<{ value?: string }>;
    metricValues?: Array<{ value?: string }>;
  }>;
};

const n = (v: string | undefined) => {
  const x = Number(v ?? 0);
  return Number.isFinite(x) && x >= 0 ? Math.round(x) : 0;
};

/** "20261010" → "2026-10-10". */
const gaDay = (v: string) =>
  `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}`;

/** Unique users for the last 30 whole days, the 30 before, and per day (oldest first). */
export async function fetchGa4Traffic(
  token: string,
  propertyId: string,
  now = new Date(),
  fetchImpl: Fetch = fetch,
): Promise<TrafficReading> {
  const url = `${DATA}/properties/${propertyId}:runReport`;
  const range = (from: number, to: number) => ({
    startDate: isoDay(daysAgo(now, from)),
    endDate: isoDay(daysAgo(now, to)),
  });
  const [totals, daily] = await Promise.all([
    // Two ranges in one request: GA4 adds a `dateRange` dimension (date_range_0 / _1).
    call<Report>(fetchImpl, token, url, {
      method: "POST",
      body: JSON.stringify({
        dateRanges: [range(30, 1), range(60, 31)],
        metrics: [{ name: "totalUsers" }],
      }),
    }),
    call<Report>(fetchImpl, token, url, {
      method: "POST",
      body: JSON.stringify({
        dateRanges: [range(30, 1)],
        dimensions: [{ name: "date" }],
        metrics: [{ name: "totalUsers" }],
        orderBys: [{ dimension: { dimensionName: "date" } }],
        limit: 100,
      }),
    }),
  ]);
  const byRange = new Map(
    (totals.rows ?? []).map((r) => [
      r.dimensionValues?.[0]?.value ?? "",
      n(r.metricValues?.[0]?.value),
    ]),
  );
  return {
    visitors30d: byRange.get("date_range_0") ?? 0,
    visitorsPrev30d: byRange.get("date_range_1") ?? 0,
    daily: (daily.rows ?? [])
      .map((r) => ({
        day: gaDay(r.dimensionValues?.[0]?.value ?? ""),
        visitors: n(r.metricValues?.[0]?.value),
      }))
      .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d.day))
      .sort((a, b) => a.day.localeCompare(b.day)),
    domain: null,
  };
}
