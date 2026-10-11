import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { MilestoneStore } from "./milestones-job";
import { normalizeStartup, schemaMode } from "./data/startup-columns";

// Phase 10d: the milestone job's store on Supabase (service role; the ledger and auto posts are
// server-only writes). Published, non-demo startups only; posts_copy_startup fills province /
// category on insert.
//
// R2 disclosure levels: "crossed ฿X" is itself a disclosure, so once the migration is live the job
// reads the public twins: a value is set only when the owner shows that group `exact`, and a
// milestone can't fire for a band / growth / badge / private group.

export function supabaseMilestoneStore(
  db: SupabaseClient<Database>,
): MilestoneStore {
  return {
    async startups() {
      const mode = await schemaMode();
      const { data, error } = await db
        .from("startups")
        .select(
          (mode === "public"
            ? "id, name, owner_id, status, is_demo, public_revenue_level, public_mrr_cents, public_revenue_all_time_cents, public_build_stars, public_build_synced_at"
            : "id, name, owner_id, status, is_demo, verification_status, mrr_cents, revenue_all_time_cents, build_stars, build_synced_at") as "id, name, owner_id, status, is_demo, verification_status, mrr_cents, revenue_all_time_cents, build_stars, build_synced_at",
        )
        .eq("status", "published")
        .eq("is_demo", false);
      if (error) throw new Error(`milestones startups: ${error.message}`);
      return (data ?? []).map((r) => normalizeStartup(mode, r));
    },
    async ledgerKeys() {
      const { data, error } = await db.from("milestones").select("key");
      if (error) throw new Error(`milestones ledger: ${error.message}`);
      return new Set((data ?? []).map((m) => m.key));
    },
    async claim(key, startupId) {
      const { data, error } = await db
        .from("milestones")
        .upsert(
          { key, startup_id: startupId },
          { onConflict: "key", ignoreDuplicates: true },
        )
        .select("key");
      if (error) throw new Error(`milestones claim: ${error.message}`);
      return (data ?? []).length === 1;
    },
    async release(key) {
      await db.from("milestones").delete().eq("key", key).is("post_id", null);
    },
    async post({ authorId, startupId, body, key }) {
      const { data, error } = await db
        .from("posts")
        .insert({
          author_id: authorId,
          startup_id: startupId,
          type: "milestone",
          body,
          is_auto: true,
          milestone_key: key,
        })
        .select("id")
        .single();
      if (error || !data) throw new Error(`milestones post: ${error?.message}`);
      return data.id;
    },
    async linkPost(key, postId) {
      await db.from("milestones").update({ post_id: postId }).eq("key", key);
    },
  };
}
