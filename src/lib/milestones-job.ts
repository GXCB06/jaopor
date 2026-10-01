// Phase 10d: the daily milestone job, written against a small store interface so the same code
// runs on Supabase (lib/milestones-store.ts, cron) and on an in-memory store in tests.
//
// Order per milestone: claim the ledger key first (insert … on conflict do nothing), and post only
// when this run claimed it. A failed post releases the claim so the next run retries. Running the
// job twice — or two runs at once — can't create a duplicate: the ledger key is the primary key
// and posts.milestone_key is unique.

import {
  milestoneBodyTh,
  milestonesDue,
  type MilestoneStartup,
} from "./milestones";

export type MilestoneStore = {
  startups(): Promise<(MilestoneStartup & { owner_id: string })[]>;
  ledgerKeys(): Promise<Set<string>>;
  /** true when this call inserted the key (false: it already existed). */
  claim(key: string, startupId: number): Promise<boolean>;
  release(key: string): Promise<void>;
  /** Inserts the auto post; returns its id. */
  post(p: {
    authorId: string;
    startupId: number;
    body: string;
    key: string;
  }): Promise<number>;
  linkPost(key: string, postId: number): Promise<void>;
};

export async function runMilestones(
  store: MilestoneStore,
  thbPerUsd: number | null,
): Promise<{ posted: string[]; failed: string[] }> {
  const [startups, ledger] = await Promise.all([
    store.startups(),
    store.ledgerKeys(),
  ]);
  const posted: string[] = [];
  const failed: string[] = [];
  for (const s of startups) {
    for (const m of milestonesDue(s, ledger, thbPerUsd)) {
      if (!(await store.claim(m.key, s.id))) continue; // another run got there first
      try {
        const postId = await store.post({
          authorId: s.owner_id,
          startupId: s.id,
          body: milestoneBodyTh(s.name, m.family, m.level),
          key: m.key,
        });
        await store.linkPost(m.key, postId);
        ledger.add(m.key);
        posted.push(m.key);
      } catch {
        await store.release(m.key).catch(() => {});
        failed.push(m.key);
      }
    }
  }
  return { posted, failed };
}
