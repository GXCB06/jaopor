import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Phase 10 (migration feed_posts): deletes the files queued in storage_cleanup. Triggers queue a
// file whenever its post_images row goes away (removed image, deleted or hidden post, deleted
// account); SQL can't delete Storage files, so the server does it through the Storage API —
// right after its own actions (`paths`), and for everything left over in the daily cron.

/** Deletes queued files (all, or only `paths`); rows are removed only once their file is gone. */
export async function drainStorageCleanup(
  opts: { paths?: string[]; limit?: number } = {},
): Promise<number> {
  const admin = createAdminClient();
  let query = admin
    .from("storage_cleanup")
    .select("id, bucket, path")
    .order("id")
    .limit(opts.limit ?? 500);
  if (opts.paths) {
    if (!opts.paths.length) return 0;
    query = query.in("path", opts.paths);
  }
  const { data: rows } = await query;
  if (!rows?.length) return 0;

  const byBucket = new Map<string, { id: number; path: string }[]>();
  for (const r of rows)
    byBucket.set(r.bucket, [...(byBucket.get(r.bucket) ?? []), r]);

  let done = 0;
  for (const [bucket, items] of byBucket) {
    // remove() succeeds for files that are already gone, so a retried row doesn't get stuck.
    const { error } = await admin.storage
      .from(bucket)
      .remove(items.map((i) => i.path));
    if (error) {
      console.error("[storage-cleanup] remove failed:", bucket, error.message);
      continue;
    }
    await admin
      .from("storage_cleanup")
      .delete()
      .in(
        "id",
        items.map((i) => i.id),
      );
    done += items.length;
  }
  return done;
}
