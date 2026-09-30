// The JaoPor mark for the image renderers (OG card, share cards, SVG badge): the user's blue app
// tile, read from disk once per server instance and inlined as a data URI (no network fetch).
import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

let tile: Promise<string> | null = null;

/** 128px PNG tile as a data URI (public/brand/jaopor-tile.png). */
export function logoTileDataUri(): Promise<string> {
  tile ??= readFile(join(process.cwd(), "public/brand/jaopor-tile.png")).then(
    (b) => `data:image/png;base64,${b.toString("base64")}`,
  );
  return tile;
}

let small: Promise<string> | null = null;

/** 64px version for the tiny SVG badge (keeps the badge a few KB). */
export function logoTileSmallDataUri(): Promise<string> {
  small ??= readFile(join(process.cwd(), "src/assets/jaopor-tile-64.png")).then(
    (b) => `data:image/png;base64,${b.toString("base64")}`,
  );
  return small;
}
