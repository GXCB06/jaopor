import { beforeEach, describe, expect, it, vi } from "vitest";

// Claim flow regression (security review 2026-10-18): an imported (`unclaimed`) listing changes
// hands only through the JaoPor snippet on its own site or its own GitHub repo. Analytics accounts
// and payment keys are refused before anything is read or written.

const snippet = vi.hoisted(() => ({ result: "missing" as string }));
vi.mock("@/lib/net/link-preview", () => ({
  findOwnerSnippet: vi.fn(async () => snippet.result),
}));
const repoOwner = vi.hoisted(() => ({ ok: true }));
vi.mock("@/lib/build/github", async (orig) => ({
  ...(await orig<typeof import("@/lib/build/github")>()),
  assertRepoOwner: vi.fn(async () => {
    if (!repoOwner.ok) throw new Error("not the owner");
  }),
}));

import { connectSource, ForbiddenError } from "./sync";
import type { SourceId } from "./catalog";

const CLAIMER = "user-claimer";
const SYSTEM = "00000000-0000-4000-a000-000000000001";

type Write = { table: string; op: string; values?: unknown };

/** A fake service-role client: the listing row for reads, empty results otherwise; logs writes. */
function fakeAdmin(row: Record<string, unknown>, githubLogin = "claimer") {
  const writes: Write[] = [];
  const chain = (table: string, result: unknown) => {
    const c: Record<string, unknown> = {};
    const self = new Proxy(c, {
      get(_t, prop) {
        if (prop === "then") return (res: (v: unknown) => void) => res(result);
        if (prop === "maybeSingle" || prop === "single")
          return async () => ({ data: row, error: null });
        if (["update", "insert", "upsert", "delete"].includes(String(prop)))
          return (values?: unknown) => {
            writes.push({ table, op: String(prop), values });
            return chain(table, {
              data: prop === "update" ? [{ id: row.id }] : [],
              error: null,
            });
          };
        return () => self;
      },
    });
    return self;
  };
  const admin = {
    from: (table: string) => chain(table, { data: [], error: null }),
    rpc: async () => ({ data: [], error: null }),
    auth: {
      admin: {
        getUserById: async () => ({
          data: {
            user: {
              identities: [
                {
                  provider: "github",
                  identity_data: { user_name: githubLogin },
                },
              ],
            },
          },
        }),
      },
    },
  };
  return { admin: admin as never, writes };
}

const listing = (over: Record<string, unknown> = {}) => ({
  id: 7,
  owner_id: SYSTEM,
  website_url: "https://imported.example",
  github_url: "https://github.com/claimer/imported",
  unclaimed: true,
  ...over,
});

const ownershipMoved = (writes: Write[]) =>
  writes.some(
    (w) =>
      w.table === "startups" &&
      w.op === "update" &&
      (w.values as { owner_id?: string })?.owner_id === CLAIMER,
  );

beforeEach(() => {
  snippet.result = "missing";
  repoOwner.ok = true;
});

describe("claiming an imported listing", () => {
  it.each([
    "plausible",
    "umami",
    "cloudflare",
    "ga4",
    "posthog",
    "stripe",
    "revenuecat",
    "polar",
  ] satisfies SourceId[])(
    "%s can't claim it, and nothing is written",
    async (source) => {
      const { admin, writes } = fakeAdmin(listing());
      const res = await connectSource(admin, {
        startupId: 7,
        userId: CLAIMER,
        source,
        data: { key: "k", siteId: "imported.example", projectId: "1" },
      });
      expect(res).toMatchObject({ ok: false, code: "not_claimable" });
      expect(writes).toEqual([]);
    },
  );

  it("the JaoPor snippet claims it only when it's live on the listing's site", async () => {
    const missing = fakeAdmin(listing());
    const res = await connectSource(missing.admin, {
      startupId: 7,
      userId: CLAIMER,
      source: "jaopor",
      data: {},
    });
    expect(res).toMatchObject({ ok: false, code: "not_claimable" });
    expect(ownershipMoved(missing.writes)).toBe(false);

    snippet.result = "found";
    const found = fakeAdmin(listing());
    await connectSource(found.admin, {
      startupId: 7,
      userId: CLAIMER,
      source: "jaopor",
      data: {},
    }).catch(() => null);
    expect(ownershipMoved(found.writes)).toBe(true);
  });

  it("GitHub claims it only with the repo the listing already links", async () => {
    const other = fakeAdmin(listing());
    const res = await connectSource(other.admin, {
      startupId: 7,
      userId: CLAIMER,
      source: "github",
      data: { repo: "https://github.com/claimer/some-other-repo" },
    });
    expect(res).toMatchObject({ ok: false, code: "not_claimable" });
    expect(ownershipMoved(other.writes)).toBe(false);

    const same = fakeAdmin(listing());
    await connectSource(same.admin, {
      startupId: 7,
      userId: CLAIMER,
      source: "github",
      data: { repo: "https://github.com/claimer/imported" },
    }).catch(() => null);
    expect(ownershipMoved(same.writes)).toBe(true);
  });

  it("someone else's listing that isn't imported can't be touched at all", async () => {
    const { admin, writes } = fakeAdmin(listing({ unclaimed: false }));
    await expect(
      connectSource(admin, {
        startupId: 7,
        userId: CLAIMER,
        source: "jaopor",
        data: {},
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(writes).toEqual([]);
  });
});
