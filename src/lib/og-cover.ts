// Spec 6.4 OG image: the cover screenshot (darkened) as the card background. Screenshots are
// WebP, which the OG renderer can't decode, so the cover is converted to a small JPEG data URI.
import "server-only";
import { getScreenshots } from "@/lib/data/startups";
import { screenshotUrl } from "@/lib/media";

export async function ogCoverDataUri(
  startupId: number,
): Promise<string | null> {
  try {
    const [cover] = await getScreenshots(startupId);
    if (!cover) return null;
    const res = await fetch(screenshotUrl(cover.path), {
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const { default: sharp } = await import("sharp");
    const jpeg = await sharp(Buffer.from(await res.arrayBuffer()))
      .resize(1200, 630, { fit: "cover", position: "top" })
      .jpeg({ quality: 70 })
      .toBuffer();
    return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
  } catch {
    // A missing or broken cover must never break the share card.
    return null;
  }
}
