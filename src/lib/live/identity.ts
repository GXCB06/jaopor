// Phase 8 live visitors: anonymous identities and the presence payload.
//
// Names are generated ONLY from these fixed word lists (user decision 2026-10-01): English
// "Color Animal" on /en, Thai "สัตว์+สี" on /th. A visitor stores indices, not text, so every
// name anyone sees comes from this file — a client can't broadcast arbitrary words.
// Everything received from other browsers is untrusted: `parseVisitor` validates each field and
// `pageSection` reduces paths to a fixed label set (no slugs or free text are ever displayed).
import { isProvince } from "@/lib/config/provinces";

export const COLORS = [
  { en: "Blue", th: "สีฟ้า" },
  { en: "Green", th: "สีเขียว" },
  { en: "Orange", th: "สีส้ม" },
  { en: "Purple", th: "สีม่วง" },
  { en: "Pink", th: "สีชมพู" },
  { en: "Gold", th: "สีทอง" },
  { en: "Silver", th: "สีเงิน" },
  { en: "Teal", th: "สีเขียวน้ำทะเล" },
  { en: "Red", th: "สีแดง" },
  { en: "Indigo", th: "สีคราม" },
  { en: "Mint", th: "สีมิ้นต์" },
  { en: "Coral", th: "สีปะการัง" },
] as const;

export const ANIMALS = [
  { en: "Elephant", th: "ช้าง" },
  { en: "Tiger", th: "เสือ" },
  { en: "Cat", th: "แมว" },
  { en: "Dolphin", th: "โลมา" },
  { en: "Owl", th: "นกฮูก" },
  { en: "Panda", th: "แพนด้า" },
  { en: "Turtle", th: "เต่า" },
  { en: "Rabbit", th: "กระต่าย" },
  { en: "Hornbill", th: "นกเงือก" },
  { en: "Otter", th: "นาก" },
  { en: "Deer", th: "กวาง" },
  { en: "Penguin", th: "เพนกวิน" },
  { en: "Fox", th: "จิ้งจอก" },
  { en: "Koala", th: "โคอาล่า" },
  { en: "Whale", th: "วาฬ" },
  { en: "Parrot", th: "นกแก้ว" },
  { en: "Squirrel", th: "กระรอก" },
  { en: "Peacock", th: "นกยูง" },
  { en: "Seal", th: "แมวน้ำ" },
  { en: "Gecko", th: "ตุ๊กแก" },
] as const;

export type LiveIdentity = { id: string; c: number; a: number };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function createIdentity(rand: () => number = Math.random): LiveIdentity {
  return {
    id: crypto.randomUUID(),
    c: Math.floor(rand() * COLORS.length),
    a: Math.floor(rand() * ANIMALS.length),
  };
}

export function isIdentity(v: unknown): v is LiveIdentity {
  const o = v as LiveIdentity;
  return (
    !!o &&
    typeof o.id === "string" &&
    UUID.test(o.id) &&
    Number.isInteger(o.c) &&
    o.c >= 0 &&
    o.c < COLORS.length &&
    Number.isInteger(o.a) &&
    o.a >= 0 &&
    o.a < ANIMALS.length
  );
}

/** "Blue Elephant" / "ช้างสีฟ้า". */
export function visitorName(
  v: { c: number; a: number },
  locale: string,
): string {
  const color = COLORS[v.c];
  const animal = ANIMALS[v.a];
  return locale === "th"
    ? `${animal.th}${color.th}`
    : `${color.en} ${animal.en}`;
}

export const SECTIONS = [
  "home",
  "startup",
  "startups",
  "category",
  "olympics",
  "province",
  "builders",
  "dashboard",
  "other",
] as const;
export type PageSection = (typeof SECTIONS)[number];

/** Path → one of a fixed set of labels (never shows slugs or anything user-typed). */
export function pageSection(path: string): PageSection {
  const seg = path.split("?")[0].split("/").filter(Boolean);
  const first = ["th", "en"].includes(seg[0] ?? "") ? seg[1] : seg[0];
  switch (first) {
    case undefined:
      return "home";
    case "startup":
    case "startups":
    case "olympics":
    case "province":
    case "builders":
    case "dashboard":
      return first;
    case "categories":
    case "category":
      return "category";
    default:
      return "other";
  }
}

/** What each browser tracks in presence. */
export type LiveVisitor = LiveIdentity & {
  /** Normalised path (validated shape, max 200 chars). */
  path: string;
  country: string | null;
  province: string | null;
  lat: number | null;
  lng: number | null;
  device: "mobile" | "desktop";
};

const PATH = /^\/[A-Za-z0-9/_-]{0,199}$/;

/** Validate a presence payload from another browser; null when anything is off. */
export function parseVisitor(raw: unknown): LiveVisitor | null {
  if (!isIdentity(raw)) return null;
  const o = raw as Record<string, unknown>;
  const path = typeof o.path === "string" && PATH.test(o.path) ? o.path : null;
  if (!path) return null;
  const country =
    typeof o.country === "string" && /^[A-Z]{2}$/.test(o.country)
      ? o.country
      : null;
  const province = isProvince(o.province) ? o.province : null;
  const num = (v: unknown, lo: number, hi: number) =>
    typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi
      ? Math.round(v * 100) / 100
      : null;
  const lat = num(o.lat, -90, 90);
  const lng = num(o.lng, -180, 180);
  return {
    id: raw.id,
    c: raw.c,
    a: raw.a,
    path,
    country,
    province,
    lat: lat !== null && lng !== null ? lat : null,
    lng: lat !== null && lng !== null ? lng : null,
    device: o.device === "mobile" ? "mobile" : "desktop",
  };
}

/**
 * Phase 8 switch (NEXT_PUBLIC_LIVE_VISITORS):
 * - unset / "poll" (default since 2026-10-11, owner asked for the board back): no Realtime. Each
 *   visible tab pings /api/live/ping about once a minute and reads /api/live/snapshot, which the
 *   CDN caches for 30 s, so the whole site costs about one query per half minute to read.
 * - "1" / "realtime": the original Supabase Realtime presence channel. It sends every page change
 *   to every open tab and passes the Free plan's 100 messages/s at about 50 people online
 *   (launch-readiness B-2, 2026-10-09), so only with a plan that allows it.
 * - "0" / "off": nothing (no heartbeat, no geo lookup; the routes don't touch the database).
 */
export type LiveMode = "off" | "poll" | "realtime";
export function liveMode(value: string | undefined): LiveMode {
  if (value === "0" || value === "off") return "off";
  if (value === "1" || value === "realtime") return "realtime";
  return "poll";
}
export const LIVE_MODE: LiveMode = liveMode(
  process.env.NEXT_PUBLIC_LIVE_VISITORS,
);
export const LIVE_ENABLED = LIVE_MODE !== "off";

/** One row of /api/live/snapshot: a tab seen in the last 90 s (no id, no IP). */
export type LiveSnapshotRow = {
  /** First 12 hex of the day-scoped HMAC of the browser id (rotates daily). */
  k: string;
  c: number;
  a: number;
  path: string;
  country: string | null;
  province: string | null;
  device: "mobile" | "desktop";
  /** Last heartbeat, ms since epoch. */
  at: number;
};

/** Avatar for a snapshot row: the browser's own (when stored) or one derived from its key. */
export function avatarFromKey(k: string): { c: number; a: number } {
  const n = parseInt(k.slice(0, 8), 16) || 0;
  return { c: n % COLORS.length, a: Math.floor(n / COLORS.length) % ANIMALS.length };
}
