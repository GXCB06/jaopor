// Profile photos (migration profile_avatars_v2): pure rules shared by the server action, the flow
// and the tests. They mirror the database: the profiles_avatar_url_source constraint and the
// cleanup trigger, which only ever touch this profile's own folder.

export const AVATAR_BUCKET = "avatars";
export const MAX_AVATAR_UPLOAD = 1024 * 1024; // bucket limit

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

/** Google / GitHub photo hosts (same rule as the constraint and sign-up). */
export const PROVIDER_PHOTO =
  /^https:\/\/(lh[0-9]+\.googleusercontent\.com|avatars\.githubusercontent\.com)\/[!-~]+$/;

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

/** "{userId}/{uuid}.webp|jpg" when `path` is a photo in this user's own folder, else null. */
export function ownAvatarFile(path: string, userId: string): string | null {
  return new RegExp(`^${userId}/${UUID}\\.(webp|jpg)$`).test(path) &&
    new RegExp(`^${UUID}$`).test(userId)
    ? path
    : null;
}

/** The storage path of a photo URL in this user's own folder of our bucket, or null. */
export function ownAvatarPath(
  url: string | null | undefined,
  userId: string,
): string | null {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${AVATAR_BUCKET}/`;
  const at = url.indexOf(marker);
  if (at === -1) return null;
  return ownAvatarFile(url.slice(at + marker.length), userId);
}

type Identity = {
  provider?: string;
  identity_data?: Record<string, unknown> | null;
};

const PROVIDER_NAME: Record<string, string> = {
  google: "Google",
  github: "GitHub",
};

/**
 * The sign-in photo, read from the provider's identity data (written by Google / GitHub at
 * sign-in). Never from user_metadata: users can edit that themselves through the Auth API.
 * `provider` is the display name for the editor's wording ("ใช้รูปจาก Google").
 */
export function providerPhotoSource(
  user: {
    identities?: Identity[] | null;
    app_metadata?: { provider?: string } | null;
  } | null,
): { url: string; provider: string } | null {
  const ids = user?.identities ?? [];
  const last = user?.app_metadata?.provider;
  const ordered = [
    ...ids.filter((i) => i.provider === last),
    ...ids.filter((i) => i.provider !== last),
  ];
  for (const i of ordered) {
    const url = i.identity_data?.avatar_url;
    if (
      typeof url === "string" &&
      url.length <= 500 &&
      PROVIDER_PHOTO.test(url)
    )
      return {
        url,
        provider: PROVIDER_NAME[i.provider ?? ""] ?? "Google / GitHub",
      };
  }
  return null;
}

/** Just the sign-in photo URL (what the server action stores). */
export function providerPhoto(
  user: Parameters<typeof providerPhotoSource>[0],
): string | null {
  return providerPhotoSource(user)?.url ?? null;
}

/**
 * May the share-image renderer fetch this photo? Google / GitHub photos, or a file in our own
 * avatars bucket (`supabaseUrl` = this project's URL). Nothing else is ever fetched server-side.
 */
export function shareablePhoto(
  url: string | null | undefined,
  supabaseUrl: string,
): boolean {
  if (!url || url.length > 500) return false;
  if (PROVIDER_PHOTO.test(url)) return true;
  const prefix = `${supabaseUrl.replace(/\/+$/, "")}/storage/v1/object/public/${AVATAR_BUCKET}/`;
  if (!url.startsWith(prefix)) return false;
  return new RegExp(`^${UUID}/${UUID}\\.(webp|jpg)$`).test(
    url.slice(prefix.length),
  );
}
