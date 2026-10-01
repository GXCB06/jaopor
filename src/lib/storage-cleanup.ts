import "server-only";
import { AVATAR_BUCKET } from "@/lib/avatar";
import { createAdminClient } from "@/lib/supabase/admin";

// Phase 10 (migration feed_posts): deletes the files queued in storage_cleanup. Triggers queue a
// file whenever its post_images row goes away (removed image, deleted or hidden post, deleted
// account) or a profile photo is replaced / removed / its account deleted (profile_avatars_v2); SQL can't delete Storage files, so the server does it through the Storage API —
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

  // Profile photos: never delete one a profile still shows (a stale or wrong queue row is
  // dropped instead). Queued photo paths are always in their owner's folder (cleanup trigger).
  const avatars = byBucket.get(AVATAR_BUCKET);
  if (avatars?.length) {
    const url = (path: string) =>
      admin.storage.from(AVATAR_BUCKET).getPublicUrl(path).data.publicUrl;
    const { data: used, error } = await admin
      .from("profiles")
      .select("avatar_url")
      .in(
        "avatar_url",
        avatars.map((i) => url(i.path)),
      );
    if (error) {
      byBucket.delete(AVATAR_BUCKET); // can't tell what's in use: leave them queued
    } else {
      const inUse = new Set((used ?? []).map((r) => r.avatar_url));
      const stale = avatars.filter((i) => inUse.has(url(i.path)));
      if (stale.length)
        await admin
          .from("storage_cleanup")
          .delete()
          .in(
            "id",
            stale.map((i) => i.id),
          );
      byBucket.set(
        AVATAR_BUCKET,
        avatars.filter((i) => !inUse.has(url(i.path))),
      );
    }
  }

  let done = 0;
  for (const [bucket, items] of byBucket) {
    if (!items.length) continue;
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
