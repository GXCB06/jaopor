import { describe, expect, it } from "vitest";
import { commitDays, stackFrom } from "@/lib/build/github";
import { matchStackLabel } from "@/lib/config/stack";
import { ProviderError } from "@/lib/revenue/types";
import { fetchCloudflareTraffic, validateCloudflareToken } from "./cloudflare";
import {
  dayKey,
  fromProjectSite,
  isBot,
  networkPrefix,
  sourceHost,
  visitorHashes,
} from "./pixel";

type Route = (url: string, init?: RequestInit) => Response | undefined;
function fakeFetch(...routes: Route[]) {
  const calls: string[] = [];
  const impl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push(url);
    for (const r of routes) {
      const res = r(url, init);
      if (res) return res;
    }
    return new Response("not mocked", { status: 500 });
  }) as typeof fetch;
  return { impl, calls };
}
const ok = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200 });
const status = (s: number) => new Response("{}", { status: s });
const has =
  (part: string, res: () => Response): Route =>
  (url) =>
    url.includes(part) ? res() : undefined;

async function codeOf(p: Promise<unknown>) {
  try {
    await p;
    return "resolved";
  } catch (e) {
    return e instanceof ProviderError ? e.code : "other";
  }
}

// ---------------------------------------------------------------------------
// JaoPor snippet
// ---------------------------------------------------------------------------

describe("JaoPor snippet helpers", () => {
  const CHROME =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36";

  it("filters bots and empty user agents", () => {
    expect(isBot(CHROME)).toBe(false);
    expect(isBot(null)).toBe(true);
    expect(isBot("curl/8.5.0")).toBe(true);
    expect(isBot("Mozilla/5.0 (compatible; Googlebot/2.1)")).toBe(true);
    expect(isBot("facebookexternalhit/1.1")).toBe(true);
  });

  it("only accepts beacons from the project's own site", () => {
    const h = (o: Record<string, string>) => new Headers(o);
    expect(sourceHost(h({ origin: "https://www.Shop.co.th" }))).toBe(
      "shop.co.th",
    );
    expect(
      fromProjectSite(h({ origin: "https://shop.co.th" }), "shop.co.th"),
    ).toBe(true);
    expect(
      fromProjectSite(h({ origin: "https://app.shop.co.th" }), "shop.co.th"),
    ).toBe(true);
    expect(
      fromProjectSite(h({ origin: "https://evil.com" }), "shop.co.th"),
    ).toBe(false);
    // Falls back to Referer when Origin is missing or "null".
    expect(
      fromProjectSite(
        h({ origin: "null", referer: "https://shop.co.th/x" }),
        "shop.co.th",
      ),
    ).toBe(true);
    expect(fromProjectSite(h({}), "shop.co.th")).toBe(false);
    expect(fromProjectSite(h({ origin: "https://shop.co.th" }), null)).toBe(
      false,
    );
  });

  it("groups IPs by network for the per-network cap", () => {
    expect(networkPrefix("203.0.113.7")).toBe("203.0.113");
    expect(networkPrefix("2001:DB8:1:2::1")).toBe("2001:db8:1");
  });

  it("hashes are stable within a day and change across days and projects", () => {
    const k1 = dayKey("secret", "2026-09-30");
    const k2 = dayKey("secret", "2026-10-01");
    const a = visitorHashes(k1, 1, "203.0.113.7", CHROME);
    expect(visitorHashes(k1, 1, "203.0.113.7", CHROME).visitor).toEqual(
      a.visitor,
    );
    expect(visitorHashes(k2, 1, "203.0.113.7", CHROME).visitor).not.toEqual(
      a.visitor,
    );
    expect(visitorHashes(k1, 2, "203.0.113.7", CHROME).visitor).not.toEqual(
      a.visitor,
    );
    // Same network → same net hash; different address → different visitor hash.
    const b = visitorHashes(k1, 1, "203.0.113.99", CHROME);
    expect(b.net).toEqual(a.net);
    expect(b.visitor).not.toEqual(a.visitor);
    // The raw IP never appears in what we store.
    expect(a.visitor.toString("hex")).not.toContain("203");
  });
});

// ---------------------------------------------------------------------------
// Cloudflare Web Analytics
// ---------------------------------------------------------------------------

const TOKEN = "abcdefghijklmnopqrstuvwxyz0123456789ABCD";
const ACCOUNT = "0123456789abcdef0123456789abcdef";
const active = has("/user/tokens/verify", () =>
  ok({ success: true, result: { status: "active" } }),
);
const noZones = has("/zones", () => ok({ success: true, result: [] }));
const deniedAll: Route = (url) =>
  url.includes("/workers/scripts") || url.includes("/rum/site_info")
    ? status(403)
    : undefined;

describe("Cloudflare connector", () => {
  it("accepts an analytics-only token", async () => {
    const { impl } = fakeFetch(active, noZones, deniedAll);
    await expect(
      validateCloudflareToken(TOKEN, ACCOUNT, impl),
    ).resolves.toBeUndefined();
  });

  it("rejects a token that reaches zones or Workers", async () => {
    const zones = has("/zones", () =>
      ok({ success: true, result: [{ id: "z" }] }),
    );
    expect(
      await codeOf(
        validateCloudflareToken(
          TOKEN,
          ACCOUNT,
          fakeFetch(active, zones, deniedAll).impl,
        ),
      ),
    ).toBe("not_read_only");
    const workers = has("/workers/scripts", () =>
      ok({ success: true, result: [] }),
    );
    expect(
      await codeOf(
        validateCloudflareToken(
          TOKEN,
          ACCOUNT,
          fakeFetch(active, noZones, workers, deniedAll).impl,
        ),
      ),
    ).toBe("not_read_only");
  });

  it("fails closed on an unexpected probe answer", async () => {
    const weird = has("/workers/scripts", () => status(500));
    expect(
      await codeOf(
        validateCloudflareToken(
          TOKEN,
          ACCOUNT,
          fakeFetch(active, noZones, weird, deniedAll).impl,
        ),
      ),
    ).toBe("upstream");
  });

  it("rejects inactive or unknown tokens and bad input", async () => {
    const inactive = has("/tokens/verify", () =>
      ok({ success: true, result: { status: "disabled" } }),
    );
    expect(
      await codeOf(
        validateCloudflareToken(TOKEN, ACCOUNT, fakeFetch(inactive).impl),
      ),
    ).toBe("invalid_key");
    const unknown = has("/tokens/verify", () => status(401));
    expect(
      await codeOf(
        validateCloudflareToken(TOKEN, ACCOUNT, fakeFetch(unknown).impl),
      ),
    ).toBe("invalid_key");
    expect(await codeOf(validateCloudflareToken("short", ACCOUNT))).toBe(
      "invalid_key",
    );
    expect(await codeOf(validateCloudflareToken(TOKEN, "not-an-id"))).toBe(
      "not_found",
    );
  });

  it("reads daily visits for the project's host only", async () => {
    const now = new Date("2026-09-30T12:00:00Z");
    let sentQuery = "";
    const gql: Route = (url, init) => {
      if (!url.endsWith("/graphql")) return undefined;
      sentQuery = String(init?.body ?? "");
      return ok({
        data: {
          viewer: {
            accounts: [
              {
                rumPageloadEventsAdaptiveGroups: [
                  { sum: { visits: 40 }, dimensions: { date: "2026-08-10" } },
                  { sum: { visits: 100 }, dimensions: { date: "2026-09-20" } },
                  { sum: { visits: 20 }, dimensions: { date: "2026-09-29" } },
                ],
              },
            ],
          },
        },
      });
    };
    const r = await fetchCloudflareTraffic(
      TOKEN,
      ACCOUNT,
      "https://www.shop.co.th",
      now,
      fakeFetch(gql).impl,
    );
    expect(r.visitors30d).toBe(120);
    expect(r.visitorsPrev30d).toBe(40);
    expect(r.daily).toHaveLength(2);
    expect(r.domain).toBe("shop.co.th");
    expect(sentQuery).toContain(
      'requestHost_in: [\\"shop.co.th\\",\\"www.shop.co.th\\"]',
    );
  });

  it("refuses when the account has no data for the host", async () => {
    const empty = has("/graphql", () =>
      ok({
        data: {
          viewer: { accounts: [{ rumPageloadEventsAdaptiveGroups: [] }] },
        },
      }),
    );
    expect(
      await codeOf(
        fetchCloudflareTraffic(
          TOKEN,
          ACCOUNT,
          "shop.co.th",
          new Date(),
          fakeFetch(empty).impl,
        ),
      ),
    ).toBe("domain_mismatch");
  });

  it("maps a permission error to missing_permission", async () => {
    const denied = has("/graphql", () =>
      ok({
        data: null,
        errors: [{ message: "not authorized for that account" }],
      }),
    );
    expect(
      await codeOf(
        fetchCloudflareTraffic(
          TOKEN,
          ACCOUNT,
          "shop.co.th",
          new Date(),
          fakeFetch(denied).impl,
        ),
      ),
    ).toBe("missing_permission");
  });
});

// ---------------------------------------------------------------------------
// GitHub stack detection
// ---------------------------------------------------------------------------

describe("stackFrom", () => {
  it("maps dependencies and top languages", () => {
    const pkg = JSON.stringify({
      dependencies: {
        next: "16",
        react: "19",
        "@supabase/supabase-js": "2",
        "@anthropic-ai/sdk": "1",
      },
      devDependencies: { tailwindcss: "4" },
    });
    expect(
      stackFrom({ TypeScript: 9000, CSS: 500, JavaScript: 100 }, pkg),
    ).toEqual([
      "Next.js",
      "React",
      "Tailwind CSS",
      "Supabase",
      "Claude",
      "TypeScript",
      "JavaScript",
    ]);
  });

  it("uses languages only without package.json or with broken JSON", () => {
    expect(stackFrom({ Swift: 10, Python: 5 }, null)).toEqual([
      "Swift",
      "Python",
    ]);
    expect(stackFrom({ Go: 1 }, "{not json")).toEqual(["Go"]);
  });

  it("reads other manifests and root files", () => {
    expect(
      stackFrom(
        { Python: 900, HTML: 50 },
        {
          requirements: "Django==5.0\npsycopg2-binary>=2.9  # db\nopenai\n",
          rootFiles: ["Dockerfile", "fly.toml", "README.md"],
        },
      ),
    ).toEqual(["Django", "PostgreSQL", "OpenAI", "Fly.io", "Docker", "Python"]);
    expect(
      stackFrom(
        { Dart: 10 },
        { pubspec: "dependencies:\n  flutter:\n    sdk: flutter\n" },
      ),
    ).toEqual(["Flutter", "Dart"]);
    expect(
      stackFrom(
        { PHP: 5 },
        { composer: '{"require":{"laravel/framework":"^11"}}' },
      ),
    ).toEqual(["Laravel", "PHP"]);
  });

  it("lists HTML / CSS only when it is the main language", () => {
    expect(stackFrom({ HTML: 90, JavaScript: 10 }, null)).toEqual([
      "HTML / CSS",
      "JavaScript",
    ]);
    expect(stackFrom({ JavaScript: 90, CSS: 10 }, null)).toEqual([
      "JavaScript",
    ]);
  });

  it("every label maps to a stack slug", () => {
    const pkg = JSON.stringify({
      dependencies: Object.fromEntries(
        [
          "next",
          "nuxt",
          "@remix-run/node",
          "astro",
          "@sveltejs/kit",
          "solid-js",
          "gatsby",
          "expo",
          "react-native",
          "react",
          "vue",
          "svelte",
          "@angular/core",
          "electron",
          "@tauri-apps/api",
          "@ionic/react",
          "@capacitor/core",
          "vite",
          "jquery",
          "bootstrap",
          "@mui/material",
          "sass",
          "three",
          "redux",
          "tailwindcss",
          "express",
          "hono",
          "@nestjs/core",
          "graphql",
          "@trpc/server",
          "@supabase/supabase-js",
          "firebase",
          "appwrite",
          "pocketbase",
          "convex",
          "prisma",
          "drizzle-orm",
          "pg",
          "mysql2",
          "mongoose",
          "redis",
          "@upstash/redis",
          "@neondatabase/serverless",
          "@libsql/client",
          "@pinecone-database/pinecone",
          "@clerk/nextjs",
          "auth0",
          "resend",
          "@sendgrid/mail",
          "twilio",
          "@sentry/nextjs",
          "posthog-js",
          "mixpanel-browser",
          "algoliasearch",
          "meilisearch",
          "stripe",
          "@paypal/checkout-server-sdk",
          "omise",
          "xendit-node",
          "@line/bot-sdk",
          "@anthropic-ai/sdk",
          "openai",
          "@google/genai",
          "@mistralai/mistralai",
          "ollama",
          "langchain",
          "elevenlabs",
          "ai",
        ].map((d) => [d, "1"]),
      ),
    });
    const labels = [
      ...stackFrom({}, pkg),
      ...stackFrom({}, pkg.replace(/"next"[^,]*,/, "")),
      ...stackFrom(
        {},
        {
          rootFiles: [
            "vercel.json",
            "netlify.toml",
            "wrangler.toml",
            "fly.toml",
            "railway.json",
            "render.yaml",
            "firebase.json",
            "supabase",
            "Dockerfile",
            "Procfile",
          ],
          requirements:
            "fastapi\nflask\nanthropic\ngoogle-genai\nlangchain\nline-bot-sdk\nsentry-sdk\npymongo\n",
          gemfile: 'gem "rails"',
          goMod: "module x",
        },
      ),
      ...stackFrom({ SCSS: 9 }, null),
    ];
    const unmapped = [...new Set(labels)].filter((l) => !matchStackLabel(l));
    expect(unmapped).toEqual([]);
  });

  it("never exceeds 20 labels", () => {
    const langs = Object.fromEntries(
      Array.from({ length: 30 }, (_, i) => [`L${i}`, 30 - i]),
    );
    expect(stackFrom(langs, null).length).toBeLessThanOrEqual(20);
  });
});

describe("snippet rollup math", () => {
  const now = new Date("2026-09-30T12:00:00Z");

  it("counts unique rows per day", async () => {
    const { countByDay } = await import("./pixel");
    const m = countByDay([
      { day: "2026-09-29" },
      { day: "2026-09-29" },
      { day: "2026-09-30" },
    ]);
    expect([...m]).toEqual([
      ["2026-09-29", 2],
      ["2026-09-30", 1],
    ]);
  });

  it("sums the last 30 days; compares only after 60 days of counting", async () => {
    const { summarizeSnapshots } = await import("./pixel");
    const snaps = [
      { day: "2026-08-05", visitors: 7 }, // previous window
      { day: "2026-09-01", visitors: 10 }, // day 29 → current window
      { day: "2026-09-30", visitors: 5 }, // today (partial)
    ];
    expect(summarizeSnapshots(snaps, now, "2026-09-01")).toEqual({
      visitors30d: 15,
      visitorsPrev30d: 0,
    });
    expect(summarizeSnapshots(snaps, now, "2026-07-01")).toEqual({
      visitors30d: 15,
      visitorsPrev30d: 7,
    });
  });
});

describe("commitDays", () => {
  it("turns weekly commit_activity into dated days with commits", () => {
    // 2026-09-27 is a Sunday.
    const sunday = Date.UTC(2026, 8, 27) / 1000;
    expect(
      commitDays([
        { week: sunday, days: [0, 3, 0, 0, 0, 0, 1] },
        { week: Number.NaN, days: [5] },
      ]),
    ).toEqual([
      { day: "2026-09-28", commits: 3 },
      { day: "2026-10-03", commits: 1 },
    ]);
  });
});
