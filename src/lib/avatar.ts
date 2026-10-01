// Profile photos (migration profile_avatars): pure checks shared by the server action and tests.

export const AVATAR_BUCKET = "avatars";
export const MAX_AVATAR_UPLOAD = 1024 * 1024; // bucket limit

/** The image type from the file's first bytes: WebP ("RIFF" ···· "WEBP") or JPEG (FF D8 FF). */
export function avatarType(bytes: Uint8Array): "webp" | "jpg" | null {
  const ascii = (from: number, to: number) =>
    String.fromCharCode(...bytes.subarray(from, to));
  if (bytes.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP")
    return "webp";
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  )
    return "jpg";
  return null;
}

/** The storage path of a photo in our bucket ("{user}/{uuid}.webp|jpg"), or null for anything else. */
export function avatarPath(url: string | null | undefined): string | null {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${AVATAR_BUCKET}/`;
  const at = url.indexOf(marker);
  if (at === -1) return null;
  const path = url.slice(at + marker.length);
  return /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(webp|jpg)$/.test(path) ? path : null;
}

/** The sign-in photo from Google / GitHub (user metadata), if it is a sane https URL. */
export function providerAvatar(meta: unknown): string | null {
  const url = (meta as { avatar_url?: unknown } | null)?.avatar_url;
  return typeof url === "string" &&
    url.startsWith("https://") &&
    url.length <= 500
    ? url
    : null;
}
