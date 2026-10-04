// Browser-only image re-encoding before upload. Drawing onto a canvas drops all metadata, so EXIF
// (incl. GPS) never leaves the device. WebP first; Safari (macOS and every iOS browser) can't
// encode WebP from a canvas (toBlob silently returns PNG), so it falls back to JPEG there.
import { fitWithin } from "./media";

export type UploadImageType = "image/webp" | "image/jpeg";

/** File extension stored in the path for each upload type ({folder}/{uuid}.webp|jpg). */
const UPLOAD_IMAGE_EXT: Record<UploadImageType, "webp" | "jpg"> = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
};

/**
 * Smallest-effort encode that fits `maxBytes`: WebP at each quality, then JPEG. JPEG has no
 * alpha, so transparent pixels are painted white first (they would turn black otherwise).
 */
async function encode(
  canvas: HTMLCanvasElement,
  maxBytes: number,
  qualities: number[],
): Promise<Blob> {
  for (const type of ["image/webp", "image/jpeg"] as const) {
    if (type === "image/jpeg") {
      const ctx = canvas.getContext("2d")!;
      ctx.globalCompositeOperation = "destination-over";
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    for (const q of qualities) {
      const blob = await new Promise<Blob | null>((r) =>
        canvas.toBlob(r, type, q),
      );
      if (!blob || blob.type !== type) break; // this browser can't encode it
      if (blob.size <= maxBytes) return blob;
    }
  }
  throw new Error("too-big");
}

const MAX_UPLOAD_BYTES = 3 * 1024 * 1024; // bucket limit

/** Screenshots and post images: resized to <= 2400px, WebP (JPEG on Safari) within 3 MB. */
export async function toUploadImage(file: File): Promise<{
  blob: Blob;
  type: UploadImageType;
  ext: "webp" | "jpg";
  width: number;
  height: number;
}> {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  const { width, height } = fitWithin(bmp.width, bmp.height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, width, height);
  bmp.close();
  const blob = await encode(canvas, MAX_UPLOAD_BYTES, [0.85, 0.75, 0.6, 0.45]);
  const type = blob.type as UploadImageType;
  return { blob, type, ext: UPLOAD_IMAGE_EXT[type], width, height };
}

export const AVATAR_SIZE = 512;
export const MAX_AVATAR_BYTES = 900 * 1024; // under the 1 MB bucket limit and the action body limit

/** Profile photo: centre-cropped to a square, 512 px, WebP (JPEG on Safari). */
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
  return encode(canvas, MAX_AVATAR_BYTES, [0.85, 0.7, 0.5]);
}
