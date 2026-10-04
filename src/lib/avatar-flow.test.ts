import { describe, expect, it } from "vitest";
import { PROVIDER_PHOTO, ownAvatarPath } from "./avatar";
import { ORPHAN_AGE_MS, changeAvatar, type AvatarPorts } from "./avatar-flow";

// In-memory stand-in for Storage + profiles + storage_cleanup that applies the same rules as the
// database: the profiles_avatar_url_source constraint (set() refuses other URLs) and the cleanup
// trigger (a replaced own file is queued in the same step). Failures are switched on per test.
const BASE =
  "https://letfxefyqxxrfujpwtri.supabase.co/storage/v1/object/public/avatars/";
const A = "0b6f3c1e-5d1a-4c55-9a8e-3f1b2c4d5e6f";
const B = "1c7a4d2f-6e2b-4d66-8b9f-4a2c3d5e6f70";
const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57]);

function world() {
  const files = new Map<string, number>(); // path → createdAt
  const avatar = new Map<string, string | null>([
    [A, null],
    [B, null],
  ]);
  const queue = new Set<string>();
  const fail = { set: false, remove: false, drain: false, upload: false };
  let clock = 1_000_000;
  const allowed = (user: string, url: string | null) =>
    url === null ||
    PROVIDER_PHOTO.test(url) ||
    ownAvatarPath(url, user) !== null;
  const ports: AvatarPorts = {
    async listOwn(user) {
      return [...files]
        .filter(([p]) => p.startsWith(`${user}/`))
        .map(([path, createdAt]) => ({ path, createdAt }));
    },
    async upload(path, _bytes, type) {
      if (fail.upload) return false;
      expect(["image/webp", "image/jpeg"]).toContain(type);
      files.set(path, clock);
      return true;
    },
    async remove(paths) {
      if (fail.remove) return false;
      paths.forEach((p) => files.delete(p));
      return true;
    },
    async current(user) {
      return avatar.get(user) ?? null;
    },
    async set(user, url) {
      if (fail.set || !allowed(user, url)) return false;
      const old = ownAvatarPath(avatar.get(user), user);
      if (old && avatar.get(user) !== url) queue.add(old); // the trigger
      avatar.set(user, url);
      return true;
    },
    async queue(path) {
      queue.add(path);
    },
    async drain(paths) {
      if (fail.drain) return;
      for (const p of paths) {
        if (!queue.has(p)) continue;
        const inUse = [...avatar].some(([, url]) => url === BASE + p);
        if (!inUse) files.delete(p);
        queue.delete(p);
      }
    },
    publicUrl: (path) => BASE + path,
  };
  const upload = (user: string, n: number) =>
    changeAvatar(
      ports,
      user,
      { upload: { bytes: webp, ext: "webp", id: id(n) } },
      clock,
    );
  return {
    files,
    avatar,
    queue,
    fail,
    ports,
    upload,
    tick: (ms: number) => (clock += ms),
  };
}

describe("changeAvatar", () => {
  it("normal change: new file current, previous file deleted, nothing left queued", async () => {
    const w = world();
    expect(await w.upload(A, 1)).toMatchObject({ ok: true });
    expect(await w.upload(A, 2)).toMatchObject({ ok: true });
    expect(w.avatar.get(A)).toBe(`${BASE}${A}/${id(2)}.webp`);
    // the URL handed back to the editor / header is exactly what was stored
    expect(await w.upload(A, 3)).toEqual({
      ok: true,
      url: `${BASE}${A}/${id(3)}.webp`,
    });
    expect(await w.upload(A, 2)).toMatchObject({ ok: true });
    expect([...w.files.keys()]).toEqual([`${A}/${id(2)}.webp`]);
    expect(w.queue.size).toBe(0);
  });

  it("A: profile update fails → the new upload is deleted, the current photo kept", async () => {
    const w = world();
    await w.upload(A, 1);
    w.fail.set = true;
    expect(await w.upload(A, 2)).toEqual({ ok: false });
    expect(w.avatar.get(A)).toBe(`${BASE}${A}/${id(1)}.webp`);
    expect([...w.files.keys()]).toEqual([`${A}/${id(1)}.webp`]);
  });

  it("A + delete fails too → the new upload is queued, never left untracked (T112)", async () => {
    const w = world();
    w.fail.set = true;
    w.fail.remove = true;
    expect(await w.upload(A, 1)).toEqual({ ok: false });
    expect([...w.queue]).toEqual([`${A}/${id(1)}.webp`]);
  });

  it("B: cleanup of the previous photo fails → it stays queued for the cron", async () => {
    const w = world();
    await w.upload(A, 1);
    w.fail.drain = true;
    expect(await w.upload(A, 2)).toMatchObject({ ok: true });
    expect([...w.queue]).toEqual([`${A}/${id(1)}.webp`]);
    w.fail.drain = false;
    await w.ports.drain([...w.queue]); // the daily cron
    expect([...w.files.keys()]).toEqual([`${A}/${id(2)}.webp`]);
  });

  it("C: an interrupted upload is swept by the next change once it is old enough", async () => {
    const w = world();
    await w.upload(A, 1);
    w.files.set(`${A}/${id(9)}.webp`, 1_000_000); // uploaded, then the request died
    w.tick(2 * 60_000);
    await w.upload(A, 2); // too young to tell from a parallel request: kept
    expect(w.files.has(`${A}/${id(9)}.webp`)).toBe(true);
    w.tick(ORPHAN_AGE_MS);
    await w.upload(A, 3);
    expect([...w.files.keys()].sort()).toEqual([`${A}/${id(3)}.webp`]);
  });

  it("D: rapid changes end with exactly the current file, which is never deleted", async () => {
    const w = world();
    for (let n = 1; n <= 6; n++) {
      expect(await w.upload(A, n)).toMatchObject({ ok: true });
      w.tick(1000);
    }
    expect([...w.files.keys()]).toEqual([`${A}/${id(6)}.webp`]);
    // a stale queue row for the current photo must not delete it
    w.queue.add(`${A}/${id(6)}.webp`);
    await w.ports.drain([`${A}/${id(6)}.webp`]);
    expect(w.files.has(`${A}/${id(6)}.webp`)).toBe(true);
  });

  it("back to the provider photo: own file deleted, the external URL never queued (T110)", async () => {
    const w = world();
    await w.upload(A, 1);
    const google = "https://lh3.googleusercontent.com/a/x=s96-c";
    expect(await changeAvatar(w.ports, A, { url: google }, 0)).toMatchObject({
      ok: true,
    });
    expect(w.files.size).toBe(0);
    expect(await changeAvatar(w.ports, A, { url: null }, 0)).toMatchObject({
      ok: true,
    });
    expect(w.queue.size).toBe(0);
  });

  it("isolation: A's changes never touch B's files or profile (T111)", async () => {
    const w = world();
    await w.upload(B, 1);
    w.tick(ORPHAN_AGE_MS * 2);
    await w.upload(A, 2);
    await w.upload(A, 3);
    expect(w.files.has(`${B}/${id(1)}.webp`)).toBe(true);
    expect(w.avatar.get(B)).toBe(`${BASE}${B}/${id(1)}.webp`);
    // and A can't point its profile at B's file
    expect(
      await changeAvatar(w.ports, A, { url: `${BASE}${B}/${id(1)}.webp` }, 0),
    ).toEqual({ ok: false });
  });

  it("upload failure changes nothing", async () => {
    const w = world();
    w.fail.upload = true;
    expect(await w.upload(A, 1)).toEqual({ ok: false });
    expect(w.files.size + w.queue.size).toBe(0);
    expect(w.avatar.get(A)).toBeNull();
  });
});
