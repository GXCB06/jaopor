// Browser-only: resize an image to <= 2400px and re-encode it as WebP within the 3 MB bucket
// limit (screenshots and post images). Drawing onto a canvas drops all metadata, so EXIF
// (incl. GPS) never leaves the device.
import { fitWithin } from "./media";

const MAX_UPLOAD_BYTES = 3 * 1024 * 1024; // bucket limit

export async function toWebp(
  file: File,
): Promise<{ blob: Blob; width: number; height: number }> {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  const { width, height } = fitWithin(bmp.width, bmp.height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, width, height);
  bmp.close();
  for (const q of [0.85, 0.75, 0.6, 0.45]) {
    const blob = await new Promise<Blob | null>((r) =>
      canvas.toBlob(r, "image/webp", q),
    );
    if (!blob || blob.type !== "image/webp") throw new Error("no-webp");
    if (blob.size <= MAX_UPLOAD_BYTES) return { blob, width, height };
  }
  throw new Error("too-big");
}

export const AVATAR_SIZE = 512;
export const MAX_AVATAR_BYTES = 900 * 1024; // under the 1 MB bucket limit and the action body limit

/**
 * Profile photo: centre-cropped to a square, 512 px, WebP (metadata dropped like above). Safari
 * can't encode WebP from a canvas, so it falls back to JPEG there.
 */
export async function toAvatarImage(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  const side = Math.min(bmp.width, bmp.height);
  const out = Math.min(AVATAR_SIZE, side);
  const canvas = document.createElement("canvas");
  canvas.width = out;
  canvas.height = out;
  canvas
    .getContext("2d")!
    .drawImage(
      bmp,
      (bmp.width - side) / 2,
      (bmp.height - side) / 2,
      side,
      side,
      0,
      0,
      out,
      out,
    );
  bmp.close();
  for (const type of ["image/webp", "image/jpeg"]) {
    for (const q of [0.85, 0.7, 0.5]) {
      const blob = await new Promise<Blob | null>((r) =>
        canvas.toBlob(r, type, q),
      );
      if (!blob || blob.type !== type) break; // this browser can't encode it
      if (blob.size <= MAX_AVATAR_BYTES) return blob;
    }
  }
  throw new Error("too-big");
}
