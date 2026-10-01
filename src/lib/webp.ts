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
