import { ownAvatarFile, ownAvatarPath } from "./avatar";

// The profile-photo change as one flow over small ports (storage, the profile row, the cleanup
// queue), so the failure paths can be tested. The server action wires the ports to Supabase.

export type AvatarPorts = {
  /** Files in the user's own folder of the bucket ("{user}/{name}", creation time in ms). */
  listOwn(userId: string): Promise<{ path: string; createdAt: number }[]>;
  upload(
    path: string,
    bytes: Uint8Array,
    contentType: string,
  ): Promise<boolean>;
  remove(paths: string[]): Promise<boolean>;
  current(userId: string): Promise<string | null>;
  /** Sets profiles.avatar_url; false when it is refused or fails. The database trigger queues the
   * previous own file for cleanup in the same transaction. */
  set(userId: string, url: string | null): Promise<boolean>;
  /** Adds a path to storage_cleanup (idempotent). */
  queue(path: string): Promise<void>;
  /** Deletes queued paths now (skipping any that are in use); failures stay queued. */
  drain(paths: string[]): Promise<void>;
  publicUrl(path: string): string;
};

/** Older files in the user's folder that aren't the current photo are leftovers of interrupted
 * uploads; younger ones may belong to a parallel request, so they are left alone. */
export const ORPHAN_AGE_MS = 10 * 60_000;

/** On success, the URL now stored (null = initials), for the editor and the header. */
export type AvatarOutcome = { ok: true; url: string | null } | { ok: false };

export type AvatarChange =
  | { upload: { bytes: Uint8Array; ext: "webp" | "jpg"; id: string } }
  | { url: string | null };

export async function changeAvatar(
  ports: AvatarPorts,
  userId: string,
  change: AvatarChange,
  now: number,
): Promise<AvatarOutcome> {
  const before = await ports.current(userId);
  const keep = ownAvatarPath(before, userId);
  let path: string | null = null;
  let url: string | null;

  if ("upload" in change) {
    const files = await ports.listOwn(userId).catch(() => []);
    const stale = files
      .filter(
        (f) =>
          ownAvatarFile(f.path, userId) &&
          f.path !== keep &&
          now - f.createdAt > ORPHAN_AGE_MS,
      )
      .map((f) => f.path);
    if (stale.length) await ports.remove(stale).catch(() => false);

    path = ownAvatarFile(
      `${userId}/${change.upload.id}.${change.upload.ext}`,
      userId,
    );
    if (!path) return { ok: false };
    const type = change.upload.ext === "webp" ? "image/webp" : "image/jpeg";
    if (!(await ports.upload(path, change.upload.bytes, type)))
      return { ok: false };
    url = ports.publicUrl(path);
  } else {
    url = change.url;
  }

  if (!(await ports.set(userId, url).catch(() => false))) {
    // Never leave the new file behind: delete it, or queue it if even that fails.
    if (path && !(await ports.remove([path]).catch(() => false)))
      await ports.queue(path).catch(() => {});
    return { ok: false };
  }
  // The trigger queued the previous file; delete it now rather than at the next cron.
  if (keep && keep !== path) await ports.drain([keep]).catch(() => {});
  return { ok: true, url };
}
