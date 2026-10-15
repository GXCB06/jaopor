// App Store Connect "Sales and Trends" reports — a pure reader for Apple's own sales report.
// Owner decision 2026-10-15: land the connector + tests only. No SourceKind, no DB column, no UI; a
// `downloads` metric (option A in docs/research/posthog-and-appstore.md §2.9) still needs sign-off.
//
// Two hard facts shape this file:
//  - Auth is an ES256 JWT signed with the founder's App Store Connect API key (.p8, PKCS#8 PEM),
//    lifetime ≤20 minutes, `aud: "appstoreconnect-v1"`. JWT ES256 needs the raw R||S signature, so we
//    sign with `dsaEncoding: "ieee-p1363"` (DER would be rejected by Apple).
//  - The response body is gzipped TSV. Apple's numbers are read as-is, so a `downloads` figure would
//    always be labelled "reported by App Store Connect" — never "verified" (see the research doc).
import { createPrivateKey, sign as cryptoSign } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { ProviderError } from "@/lib/revenue/types";

type Fetch = typeof fetch;

export const APPSTORE_API = "https://api.appstoreconnect.apple.com";
const REPORTS = "/v1/salesReports";
/** Apple caps the JWT at 20 minutes; we ask for exactly that. */
const MAX_TTL_SECONDS = 1200;

export type AppStoreCreds = {
  /** App Store Connect "Issuer ID" (a UUID) — goes in the JWT `iss` claim. */
  issuerId: string;
  /** App Store Connect API key ID — goes in the JWT header `kid`. */
  keyId: string;
  /** The .p8 private key (PKCS#8 PEM). Secret: never log or store in plain text. */
  privateKey: string;
  /** Vendor number from Payments and Financial Reports. */
  vendorNumber: string;
};

export type SalesFrequency = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

export type SalesQuery = {
  frequency: SalesFrequency;
  /** Default SALES. */
  reportType?: string;
  /** Default SUMMARY. */
  reportSubType?: string;
  /** Default 1_0. */
  version?: string;
  /** YYYY-MM-DD; required by Apple for every frequency except DAILY. */
  reportDate?: string;
};

/** The SUMMARY columns we care about, pulled out of the raw row. */
export type SalesRow = {
  /** Apple Identifier of the app (the `id…` in an App Store URL), or "" if the row lacks one. */
  appleId: string;
  /** Apple's "Product Type Identifier" (1, 1F, 7, IA1, …). */
  productTypeId: string;
  /** "Units" — first-time purchases/installs; negative on refunds. */
  units: number;
  /** "Begin Date" — the report day (Pacific Time), YYYY-MM-DD. */
  date: string;
  /** "Country Code" — the storefront. */
  countryCode: string;
  /** "Title" — the app name as Apple reports it. */
  title: string;
};

const b64url = (data: string | Uint8Array) =>
  Buffer.from(data).toString("base64url");

/**
 * Signs an App Store Connect API token. `iat` defaults to now; pass a fixed value in tests. The
 * `exp` is capped at Apple's 20-minute maximum regardless of `ttlSeconds`.
 */
export function signAppStoreToken(
  creds: Pick<AppStoreCreds, "issuerId" | "keyId" | "privateKey">,
  iat: number = Math.floor(Date.now() / 1000),
  ttlSeconds: number = MAX_TTL_SECONDS,
): string {
  const header = { alg: "ES256", kid: creds.keyId, typ: "JWT" };
  const payload = {
    iss: creds.issuerId,
    iat,
    exp: iat + Math.min(Math.max(ttlSeconds, 1), MAX_TTL_SECONDS),
    aud: "appstoreconnect-v1",
  };
  const input = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const key = createPrivateKey(creds.privateKey);
  // ieee-p1363 → raw R||S, which is what a JWT ES256 signature must be (not DER).
  const sig = cryptoSign("sha256", Buffer.from(input), {
    key,
    dsaEncoding: "ieee-p1363",
  });
  return `${input}.${sig.toString("base64url")}`;
}

/** The exact App Store Connect URL for a report request (encoding handled by URLSearchParams). */
export function buildSalesUrl(vendorNumber: string, query: SalesQuery): string {
  const p = new URLSearchParams();
  p.set("filter[frequency]", query.frequency);
  p.set("filter[reportType]", query.reportType ?? "SALES");
  p.set("filter[reportSubType]", query.reportSubType ?? "SUMMARY");
  p.set("filter[version]", query.version ?? "1_0");
  p.set("filter[vendorNumber]", vendorNumber);
  if (query.reportDate) p.set("filter[reportDate]", query.reportDate);
  return `${APPSTORE_API}${REPORTS}?${p.toString()}`;
}

/** Gunzips a sales-report body (`application/a-gzip`) to UTF-8 TSV text. */
export function gunzipSalesReport(body: Uint8Array): string {
  return gunzipSync(body).toString("utf8");
}

/**
 * Parses Apple's tab-separated SUMMARY report. The first line is the header (Apple includes it), so
 * columns are looked up by name and a reordered report still parses. Blank lines are ignored.
 */
export function parseSalesTsv(text: string): SalesRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const header = lines[0]!.split("\t").map((h) => h.trim().toLowerCase());
  const at = (name: string) => header.indexOf(name);
  const iType = at("product type identifier");
  const iUnits = at("units");
  const iApple = at("apple identifier");
  const iDate = at("begin date");
  const iCountry = at("country code");
  const iTitle = at("title");

  const cell = (cols: string[], i: number) =>
    i >= 0 ? (cols[i] ?? "").trim() : "";
  const rows: SalesRow[] = [];
  for (const line of lines.slice(1)) {
    const cols = line.split("\t");
    const units = Number.parseInt(cell(cols, iUnits), 10);
    rows.push({
      appleId: cell(cols, iApple),
      productTypeId: cell(cols, iType),
      units: Number.isFinite(units) ? units : 0,
      date: cell(cols, iDate),
      countryCode: cell(cols, iCountry),
      title: cell(cols, iTitle),
    });
  }
  return rows;
}

/**
 * The App Store numeric id from a listing's App Store URL (`…/id123456789`). Returns null when the
 * URL has none — the caller should then refuse rather than guess which app to read.
 */
export function appleIdFromUrl(url: string | null | undefined): string | null {
  const m = (url ?? "").match(/\/id(\d{6,12})/);
  return m ? m[1]! : null;
}

/**
 * Product type identifiers that are an app/bundle **acquisition** (Apple's "App and Bundle Units"):
 * a first-time download. Updates (`7*`), re-downloads (`3*`) and in-app purchases (`IA*`) are not
 * downloads. Allow-list, so an unknown future type is excluded (fail-closed toward not counting).
 */
const DOWNLOAD_PRODUCT_TYPES = new Set([
  "1",
  "1F",
  "1T",
  "1-B",
  "1E",
  "1EP",
  "1EU",
  "F1",
  "F1-B",
]);

export function countsAsDownload(productTypeId: string): boolean {
  return DOWNLOAD_PRODUCT_TYPES.has(productTypeId.trim().toUpperCase());
}

/**
 * First-time downloads = the sum of `Units` over acquisition rows, for one app when `appleId` is
 * given. Refunds are already negative in `Units`, so they reduce the total.
 */
export function sumDownloads(rows: SalesRow[], appleId?: string): number {
  return rows.reduce(
    (n, r) =>
      (!appleId || r.appleId === appleId) && countsAsDownload(r.productTypeId)
        ? n + r.units
        : n,
    0,
  );
}

function fail(res: Response, what: string): never {
  if (res.status === 401 || res.status === 403)
    throw new ProviderError(
      "invalid_key",
      "App Store Connect refused this key. Check the key id, issuer id and that the key's role includes Sales and Reports.",
    );
  if (res.status === 404)
    throw new ProviderError(
      "not_found",
      "App Store Connect has no report there. Check the vendor number and report date.",
    );
  if (res.status === 429)
    throw new ProviderError(
      "rate_limited",
      "App Store Connect is rate-limiting us.",
    );
  throw new ProviderError(
    "upstream",
    `App Store Connect responded with HTTP ${res.status} while reading ${what}.`,
  );
}

/**
 * Fetches and parses one sales report. `now` is injectable so token claims are deterministic in
 * tests. Returns every row Apple sent; the caller filters to the listing's app id.
 */
export async function fetchSalesReport(
  creds: AppStoreCreds,
  query: SalesQuery,
  fetchImpl: Fetch = fetch,
  now: number = Math.floor(Date.now() / 1000),
): Promise<SalesRow[]> {
  const token = signAppStoreToken(creds, now);
  const res = await fetchImpl(buildSalesUrl(creds.vendorNumber, query), {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/a-gzip",
    },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) fail(res, "the sales report");
  const body = new Uint8Array(await res.arrayBuffer());
  return parseSalesTsv(gunzipSalesReport(body));
}
