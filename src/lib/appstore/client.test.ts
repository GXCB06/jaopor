import {
  createPublicKey,
  generateKeyPairSync,
  verify as cryptoVerify,
} from "node:crypto";
import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { ProviderError } from "@/lib/revenue/types";
import {
  appleIdFromUrl,
  buildSalesUrl,
  countsAsDownload,
  fetchSalesReport,
  gunzipSalesReport,
  parseSalesTsv,
  signAppStoreToken,
  sumDownloads,
  type AppStoreCreds,
} from "@/lib/appstore/client";

// A throwaway P-256 key, generated per run so no secret is committed.
const { privateKey } = generateKeyPairSync("ec", {
  namedCurve: "prime256v1",
});
const privPem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();

const creds: AppStoreCreds = {
  issuerId: "69a6de70-0000-0000-0000-000000000000",
  keyId: "ABCDE12345",
  privateKey: privPem,
  vendorNumber: "87654321",
};

const HEADER = [
  "Provider",
  "Title",
  "Product Type Identifier",
  "Units",
  "Begin Date",
  "Country Code",
  "Apple Identifier",
].join("\t");

const report = (rows: string[]) => [HEADER, ...rows].join("\n") + "\n";

async function code(p: Promise<unknown>) {
  try {
    await p;
    return "resolved";
  } catch (e) {
    return e instanceof ProviderError ? e.code : "other";
  }
}

describe("App Store Connect token (ES256 JWT)", () => {
  it("signs a verifiable ES256 token with the required claims", () => {
    const token = signAppStoreToken(creds, 1_700_000_000);
    const [h, p, sig] = token.split(".");
    const header = JSON.parse(Buffer.from(h!, "base64url").toString("utf8"));
    const payload = JSON.parse(Buffer.from(p!, "base64url").toString("utf8"));
    expect(header).toEqual({ alg: "ES256", kid: "ABCDE12345", typ: "JWT" });
    expect(payload).toEqual({
      iss: creds.issuerId,
      iat: 1_700_000_000,
      exp: 1_700_000_000 + 1200,
      aud: "appstoreconnect-v1",
    });
    const okSig = cryptoVerify(
      "sha256",
      Buffer.from(`${h}.${p}`),
      { key: createPublicKey(privPem), dsaEncoding: "ieee-p1363" },
      Buffer.from(sig!, "base64url"),
    );
    expect(okSig).toBe(true);
  });

  it("caps the lifetime at Apple's 20-minute maximum", () => {
    const token = signAppStoreToken(creds, 1_700_000_000, 99_999);
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1]!, "base64url").toString("utf8"),
    );
    expect(payload.exp - payload.iat).toBe(1200);
  });
});

describe("App Store Connect report parsing", () => {
  it("builds the salesReports URL with every filter", () => {
    const url = buildSalesUrl("87654321", {
      frequency: "MONTHLY",
      reportDate: "2026-09-01",
    });
    expect(url).toContain(
      "https://api.appstoreconnect.apple.com/v1/salesReports",
    );
    const q = new URL(url).searchParams;
    expect(q.get("filter[frequency]")).toBe("MONTHLY");
    expect(q.get("filter[reportType]")).toBe("SALES");
    expect(q.get("filter[reportSubType]")).toBe("SUMMARY");
    expect(q.get("filter[version]")).toBe("1_0");
    expect(q.get("filter[vendorNumber]")).toBe("87654321");
    expect(q.get("filter[reportDate]")).toBe("2026-09-01");
  });

  it("parses the SUMMARY TSV by column name", () => {
    const rows = parseSalesTsv(
      report([
        "APPLE\tShop\t1\t120\t2026-09-28\tTH\t123456789",
        "APPLE\tShop\t7\t340\t2026-09-28\tTH\t123456789",
      ]),
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      appleId: "123456789",
      productTypeId: "1",
      units: 120,
      date: "2026-09-28",
      countryCode: "TH",
      title: "Shop",
    });
  });

  it("parses an empty or header-only report to no rows", () => {
    expect(parseSalesTsv("")).toEqual([]);
    expect(parseSalesTsv(report([]))).toEqual([]);
  });

  it("gunzips a gzipped report body", () => {
    const text = report(["APPLE\tShop\t1\t5\t2026-09-28\tTH\t123456789"]);
    expect(gunzipSalesReport(gzipSync(Buffer.from(text)))).toBe(text);
  });

  it("parses the Apple id from an App Store URL", () => {
    expect(
      appleIdFromUrl("https://apps.apple.com/th/app/shop/id123456789"),
    ).toBe("123456789");
    expect(appleIdFromUrl("https://apps.apple.com/app/id123456789?l=th")).toBe(
      "123456789",
    );
    expect(appleIdFromUrl("https://apps.apple.com/th/app/shop")).toBe(null);
    expect(appleIdFromUrl(null)).toBe(null);
  });

  it("counts app/bundle units as downloads, but not updates/IAP", () => {
    for (const id of ["1", "1F", "1T", "1-B", "1E", "1EP", "1EU", "F1", "F1-B"])
      expect(countsAsDownload(id)).toBe(true);
    for (const id of ["7", "7F", "7T", "3", "3F", "IA1", "IA9", "IAY", "FI1"])
      expect(countsAsDownload(id)).toBe(false);
  });

  it("sums first-time units for one app, ignoring updates and refunds", () => {
    const rows = parseSalesTsv(
      report([
        "APPLE\tShop\t1\t120\t2026-09-28\tTH\t123456789",
        "APPLE\tShop\t7\t340\t2026-09-28\tTH\t123456789",
        "APPLE\tShop\t1\t-20\t2026-09-29\tTH\t123456789",
        "APPLE\tOther\t1\t999\t2026-09-28\tTH\t999999999",
      ]),
    );
    expect(sumDownloads(rows, "123456789")).toBe(100);
    expect(sumDownloads(rows)).toBe(1099);
  });
});

describe("App Store Connect fetch", () => {
  const gzipped = (rows: string[]) =>
    new Response(gzipSync(Buffer.from(report(rows))), {
      status: 200,
      headers: { "content-type": "application/a-gzip" },
    });

  function fakeFetch(res: Response) {
    let seen: { url: string; init?: RequestInit } | null = null;
    const impl = (async (input: RequestInfo | URL, init?: RequestInit) => {
      seen = { url: String(input), init };
      return res;
    }) as typeof fetch;
    return { impl, get: () => seen };
  }

  it("sends a bearer token and returns parsed rows", async () => {
    const f = fakeFetch(
      gzipped(["APPLE\tShop\t1\t42\t2026-09-28\tTH\t123456789"]),
    );
    const rows = await fetchSalesReport(
      creds,
      { frequency: "DAILY" },
      f.impl,
      1_700_000_000,
    );
    expect(sumDownloads(rows, "123456789")).toBe(42);
    const auth = new Headers(f.get()!.init!.headers).get("Authorization");
    expect(auth).toMatch(/^Bearer eyJ/);
  });

  it("maps HTTP errors to provider codes", async () => {
    const denied = fakeFetch(new Response("{}", { status: 403 }));
    expect(
      await code(fetchSalesReport(creds, { frequency: "DAILY" }, denied.impl)),
    ).toBe("invalid_key");

    const throttled = fakeFetch(new Response("{}", { status: 429 }));
    expect(
      await code(
        fetchSalesReport(creds, { frequency: "DAILY" }, throttled.impl),
      ),
    ).toBe("rate_limited");
  });
});
