import { describe, expect, it } from "vitest";
import { runMilestones, type MilestoneStore } from "./milestones-job";
import {
  milestoneKey,
  milestonesDue,
  parseMilestoneKey,
  type MilestoneStartup,
} from "./milestones";

const THB = 35;
const s = (over: Partial<MilestoneStartup> = {}): MilestoneStartup => ({
  id: 7,
  name: "ShopJai",
  status: "published",
  is_demo: false,
  verification_status: "verified",
  mrr_cents: 0,
  revenue_all_time_cents: 0,
  build_stars: null,
  build_synced_at: null,
  ...over,
});
// ฿ → USD cents at THB per USD
const thb = (baht: number) => Math.ceil((baht / THB) * 100); // round up so the level is reached
const keys = (ms: { key: string }[]) => ms.map((m) => m.key).sort();

describe("milestonesDue", () => {
  it("posts only the highest level reached per family on the first run", () => {
    const due = milestonesDue(
      s({ mrr_cents: thb(150_000), revenue_all_time_cents: thb(2_000_000) }),
      new Set(),
      THB,
    );
    expect(keys(due)).toEqual([
      "mrr_100000:7",
      "revenue_1000000:7",
      "verified:7",
    ]);
  });

  it("never re-posts a level at or below one already posted (drop and recover)", () => {
    const ledger = new Set(["verified:7", "mrr_10000:7"]);
    // MRR fell to ฿5k: the ฿1k level must not appear after ฿10k was posted.
    expect(milestonesDue(s({ mrr_cents: thb(5_000) }), ledger, THB)).toEqual(
      [],
    );
    // Back to ฿12k: still nothing new.
    expect(milestonesDue(s({ mrr_cents: thb(12_000) }), ledger, THB)).toEqual(
      [],
    );
    // ฿100k is new.
    expect(
      keys(milestonesDue(s({ mrr_cents: thb(100_000) }), ledger, THB)),
    ).toEqual(["mrr_100000:7"]);
  });

  it("uses verified data only", () => {
    expect(
      milestonesDue(
        s({ verification_status: "unverified", mrr_cents: thb(50_000) }),
        new Set(),
        THB,
      ),
    ).toEqual([]);
    expect(milestonesDue(s({ is_demo: true }), new Set(), THB)).toEqual([]);
    expect(milestonesDue(s({ status: "hidden" }), new Set(), THB)).toEqual([]);
    // Stars without a GitHub sync don't count.
    expect(
      keys(
        milestonesDue(
          s({ verification_status: "unverified", build_stars: 500 }),
          new Set(),
          THB,
        ),
      ),
    ).toEqual([]);
    expect(
      keys(
        milestonesDue(
          s({
            verification_status: "unverified",
            build_stars: 500,
            build_synced_at: "2026-10-01T00:00:00Z",
          }),
          new Set(),
          THB,
        ),
      ),
    ).toEqual(["stars_100:7"]);
  });

  it("skips money milestones without an exchange rate", () => {
    expect(
      keys(milestonesDue(s({ mrr_cents: thb(5_000) }), new Set(), null)),
    ).toEqual(["verified:7"]);
  });

  it("round-trips keys", () => {
    expect(parseMilestoneKey(milestoneKey("mrr", 10_000, 42))).toEqual({
      family: "mrr",
      level: 10_000,
      startupId: 42,
    });
    expect(parseMilestoneKey("verified:3")).toEqual({
      family: "verified",
      level: 1,
      startupId: 3,
    });
    expect(parseMilestoneKey("verified_5:3")).toBeNull();
    expect(parseMilestoneKey("mrr:3")).toBeNull();
    expect(parseMilestoneKey(null)).toBeNull();
  });
});

/** In-memory store with the same uniqueness rules as the database. */
function memoryStore(startups: (MilestoneStartup & { owner_id: string })[]) {
  const ledger = new Map<string, number | null>();
  const posts: { id: number; key: string; body: string }[] = [];
  let failNext = false;
  const store: MilestoneStore = {
    startups: async () => startups,
    ledgerKeys: async () => new Set(ledger.keys()),
    claim: async (key) => {
      if (ledger.has(key)) return false;
      ledger.set(key, null);
      return true;
    },
    release: async (key) => {
      ledger.delete(key);
    },
    post: async ({ key, body }) => {
      if (failNext) {
        failNext = false;
        throw new Error("insert failed");
      }
      if (posts.some((p) => p.key === key))
        throw new Error("duplicate milestone_key");
      const id = posts.length + 1;
      posts.push({ id, key, body });
      return id;
    },
    linkPost: async (key, id) => {
      ledger.set(key, id);
    },
  };
  return { store, posts, ledger, failOnce: () => (failNext = true) };
}

describe("runMilestones", () => {
  const startups = [
    { ...s({ mrr_cents: thb(12_000) }), owner_id: "owner-7" },
    {
      ...s({ id: 8, name: "Demo", is_demo: true, mrr_cents: thb(99_000) }),
      owner_id: "o8",
    },
  ];

  it("is idempotent: running twice creates no duplicates", async () => {
    const db = memoryStore(startups);
    const first = await runMilestones(db.store, THB);
    const second = await runMilestones(db.store, THB);
    expect(first.posted.sort()).toEqual(["mrr_10000:7", "verified:7"]);
    expect(second.posted).toEqual([]);
    expect(db.posts.map((p) => p.key).sort()).toEqual([
      "mrr_10000:7",
      "verified:7",
    ]);
    expect(db.posts.find((p) => p.key === "mrr_10000:7")?.body).toBe(
      "ShopJai แตะ ฿10,000 MRR",
    );
  });

  it("two runs at the same time still post each milestone once", async () => {
    const db = memoryStore(startups);
    await Promise.all([
      runMilestones(db.store, THB),
      runMilestones(db.store, THB),
    ]);
    expect(db.posts.map((p) => p.key).sort()).toEqual([
      "mrr_10000:7",
      "verified:7",
    ]);
  });

  it("a failed post releases its claim so the next run retries", async () => {
    const db = memoryStore(startups);
    db.failOnce();
    const first = await runMilestones(db.store, THB);
    expect(first.failed).toHaveLength(1);
    const second = await runMilestones(db.store, THB);
    expect(second.posted).toEqual(first.failed);
    expect(db.posts).toHaveLength(2);
  });
});
