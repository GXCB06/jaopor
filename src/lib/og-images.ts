// Images for the next/og renderers (OG card, share cards). The renderer can't decode WebP and
// shouldn't fetch arbitrary URLs mid-render, so logos and the cover screenshot are converted
// with sharp into small PNG/JPEG data URIs first. Any failure → null (the card still renders).
import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getScreenshots } from "@/lib/data/startups";
import { screenshotUrl } from "@/lib/media";
import { logoUrl } from "@/lib/supabase/public";

async function toDataUri(
  input: Buffer,
  resize: { width: number; height: number; fit: "cover" | "contain" },
  format: "png" | "jpeg",
): Promise<string> {
  const { default: sharp } = await import("sharp");
  const img = sharp(input).resize(resize.width, resize.height, {
    fit: resize.fit,
    position: "top",
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  });
  const buf =
    format === "png"
      ? await img.png().toBuffer()
      : await img.jpeg({ quality: 70 }).toBuffer();
  return `data:image/${format};base64,${buf.toString("base64")}`;
}

async function fetchBytes(url: string): Promise<Buffer | null> {
  const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
  if (!res.ok) return null;
  const len = Number(res.headers.get("content-length") ?? 0);
  if (len > 5 * 1024 * 1024) return null;
  return Buffer.from(await res.arrayBuffer());
}

/** Startup logo as a 256px PNG data URI (Storage logos incl. WebP, or bundled demo logos). */
export async function logoDataUri(
  logoPath: string | null,
): Promise<string | null> {
  try {
    if (!logoPath) return null;
    const bytes = logoPath.startsWith("demo-logos/")
      ? await readFile(join(process.cwd(), "public", logoPath))
      : await fetchBytes(logoUrl(logoPath)!);
    if (!bytes) return null;
    return await toDataUri(
      bytes,
      { width: 256, height: 256, fit: "contain" },
      "png",
    );
  } catch {
    return null;
  }
}

/** Spec 6.4 OG image: the cover screenshot (first by position) as a 1200×630 JPEG data URI. */
export async function ogCoverDataUri(
  startupId: number,
): Promise<string | null> {
  try {
    const [cover] = await getScreenshots(startupId);
    if (!cover) return null;
    const bytes = await fetchBytes(screenshotUrl(cover.path));
    if (!bytes) return null;
    return await toDataUri(
      bytes,
      { width: 1200, height: 630, fit: "cover" },
      "jpeg",
    );
  } catch {
    // A missing or broken cover must never break the share card.
    return null;
  }
}

// OAuth avatars only: the profile row's avatar_url is user-influenced, so the OG renderer never
// fetches any other host.
const AVATAR_HOSTS = new Set([
  "lh3.googleusercontent.com",
  "avatars.githubusercontent.com",
]);

/** Builder avatar as a 256px PNG data URI (allowlisted OAuth hosts only). */
export async function avatarDataUri(
  url: string | null,
): Promise<string | null> {
  try {
    if (!url) return null;
    const u = new URL(url);
    if (u.protocol !== "https:" || !AVATAR_HOSTS.has(u.hostname)) return null;
    const bytes = await fetchBytes(u.toString());
    if (!bytes) return null;
    return await toDataUri(
      bytes,
      { width: 256, height: 256, fit: "cover" },
      "png",
    );
  } catch {
    return null;
  }
}
