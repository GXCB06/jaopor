import { generateKeyPairSync, createVerify } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { ProviderError } from "@/lib/revenue/types";
import {
  assertGa4Property,
  fetchGa4Traffic,
  ga4AccessToken,
  parsePropertyId,
  parseServiceAccount,
  resetGa4TokenCache,
} from "./ga4";

// A throwaway key generated for the test (never a real credential).
const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});
const creds = {
  clientEmail: "jaopor@test.iam.gserviceaccount.com",
  privateKey,
};

type Call = { url: string; init?: RequestInit };
function fakeFetch(handler: (url: string, init?: RequestInit) => Response) {
  const calls: Call[] = [];
  const f = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init });
    return handler(url, init);
  }) as typeof fetch;
  return { f, calls };
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const code = async (p: Promise<unknown>) => {
  try {
    await p;
    return "resolved";
  } catch (e) {
    return e instanceof ProviderError
      ? e.code
      : `other:${(e as Error).message}`;
  }
};

beforeEach(() => resetGa4TokenCache());

describe("parsePropertyId / parseServiceAccount", () => {
  it.each([
    ["123456789", "123456789"],
    [" properties/987654321 ", "987654321"],
    [
      "https://analytics.google.com/analytics/web/#/p123456789/reports/intelligenthome",
      "123456789",
    ],
    ["G-ABC123XYZ", null], // a measurement ID is not the property ID
    ["12", null],
    ["", null],
  ])("%s → %s", (input, id) => {
    expect(parsePropertyId(input)).toBe(id);
  });

  it("reads the service account JSON, or null when it isn't set up", () => {
    expect(
      parseServiceAccount(
        JSON.stringify({ client_email: "a@b", private_key: "k" }),
      ),
    ).toEqual({ clientEmail: "a@b", privateKey: "k" });
    expect(parseServiceAccount(undefined)).toBeNull();
    expect(parseServiceAccount("{not json")).toBeNull();
    expect(
      parseServiceAccount(JSON.stringify({ client_email: "a@b" })),
    ).toBeNull();
  });
});

describe("ga4AccessToken", () => {
  it("asks only for the analytics.readonly scope, with a valid RS256 signature, and caches", async () => {
    const { f, calls } = fakeFetch(() =>
      json({ access_token: "tok", expires_in: 3600 }),
    );
    expect(await ga4AccessToken(creds, f, 1_000_000)).toBe("tok");
    expect(await ga4AccessToken(creds, f, 1_000_000 + 60_000)).toBe("tok");
    expect(calls).toHaveLength(1);
    const assertion = new URLSearchParams(String(calls[0].init?.body)).get(
      "assertion",
    )!;
    const [h, c, sig] = assertion.split(".");
    const claims = JSON.parse(Buffer.from(c, "base64url").toString());
    expect(claims.scope).toBe(
      "https://www.googleapis.com/auth/analytics.readonly",
    );
    expect(claims.iss).toBe(creds.clientEmail);
    expect(
      createVerify("RSA-SHA256")
        .update(`${h}.${c}`)
        .verify(publicKey, Buffer.from(sig, "base64url")),
    ).toBe(true);
  });

  it("our own credentials refused → upstream (never blamed on the founder)", async () => {
    const { f } = fakeFetch(() => json({ error: "invalid_grant" }, 400));
    expect(await code(ga4AccessToken(creds, f))).toBe("upstream");
  });

  it("a broken private key → upstream, no crash", async () => {
    const { f } = fakeFetch(() => json({}));
    expect(
      await code(ga4AccessToken({ clientEmail: "x@y", privateKey: "nope" }, f)),
    ).toBe("upstream");
  });
});

describe("assertGa4Property", () => {
  const streams = (uris: string[]) =>
    json({
      dataStreams: [
        { type: "IOS_APP_DATA_STREAM" },
        ...uris.map((u) => ({
          type: "WEB_DATA_STREAM",
          webStreamData: { defaultUri: u },
        })),
      ],
    });

  it("passes when a web stream is the website (or a subdomain)", async () => {
    const { f, calls } = fakeFetch(() => streams(["https://www.jaopor.app"]));
    expect(await assertGa4Property("tok", "123456", "jaopor.app", f)).toBe(
      "https://www.jaopor.app",
    );
    expect(calls[0].url).toBe(
      "https://analyticsadmin.googleapis.com/v1beta/properties/123456/dataStreams?pageSize=50",
    );
    expect(
      (calls[0].init?.headers as Record<string, string>).Authorization,
    ).toBe("Bearer tok");
  });

  it("another site's property → domain_mismatch", async () => {
    const { f } = fakeFetch(() => streams(["https://someone-else.com"]));
    expect(
      await code(assertGa4Property("tok", "123456", "jaopor.app", f)),
    ).toBe("domain_mismatch");
  });

  it("no web stream at all → domain_mismatch", async () => {
    const { f } = fakeFetch(() => streams([]));
    expect(
      await code(assertGa4Property("tok", "123456", "jaopor.app", f)),
    ).toBe("domain_mismatch");
  });

  it("JaoPor not added as a Viewer (403) → not_found with the fix in the message", async () => {
    const { f } = fakeFetch(() => json({}, 403));
    expect(
      await code(assertGa4Property("tok", "123456", "jaopor.app", f)),
    ).toBe("not_found");
  });

  it("rate limits and server errors are typed", async () => {
    expect(
      await code(
        assertGa4Property(
          "tok",
          "1",
          "x.com",
          fakeFetch(() => json({}, 429)).f,
        ),
      ),
    ).toBe("rate_limited");
    expect(
      await code(
        assertGa4Property(
          "tok",
          "1",
          "x.com",
          fakeFetch(() => json({}, 500)).f,
        ),
      ),
    ).toBe("upstream");
  });
});

describe("fetchGa4Traffic", () => {
  const now = new Date("2026-10-11T08:00:00Z");

  it("maps unique users for 30 days, the 30 before, and per day (oldest first)", async () => {
    const { f, calls } = fakeFetch((_url, init) => {
      const body = JSON.parse(String(init?.body));
      if (body.dimensions)
        return json({
          rows: [
            {
              dimensionValues: [{ value: "20261010" }],
              metricValues: [{ value: "12" }],
            },
            {
              dimensionValues: [{ value: "20261009" }],
              metricValues: [{ value: "7" }],
            },
          ],
        });
      return json({
        rows: [
          {
            dimensionValues: [{ value: "date_range_0" }],
            metricValues: [{ value: "150" }],
          },
          {
            dimensionValues: [{ value: "date_range_1" }],
            metricValues: [{ value: "100" }],
          },
        ],
      });
    });
    const r = await fetchGa4Traffic("tok", "123456", now, f);
    expect(r).toEqual({
      visitors30d: 150,
      visitorsPrev30d: 100,
      daily: [
        { day: "2026-10-09", visitors: 7 },
        { day: "2026-10-10", visitors: 12 },
      ],
      domain: null,
    });
    const totals = JSON.parse(
      String(
        calls.find((c) => !JSON.parse(String(c.init?.body)).dimensions)!.init
          ?.body,
      ),
    );
    expect(totals.dateRanges).toEqual([
      { startDate: "2026-09-11", endDate: "2026-10-10" },
      { startDate: "2026-08-12", endDate: "2026-09-10" },
    ]);
    expect(totals.metrics).toEqual([{ name: "totalUsers" }]);
  });

  it("no rows (a new property) → zeros, never a crash", async () => {
    const { f } = fakeFetch(() => json({}));
    expect(await fetchGa4Traffic("tok", "1", now, f)).toEqual({
      visitors30d: 0,
      visitorsPrev30d: 0,
      daily: [],
      domain: null,
    });
  });
});
