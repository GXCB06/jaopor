// Phase 8: coarse visitor location. Vercel's edge gives city-level coordinates; we round them to
// one decimal (~11 km) and add ±0.05° jitter so a pin never points at a precise spot, and map
// Thai visitors to the nearest province centre (config lat/lng). No IP is read or sent.
import {
  PROVINCE_LIST,
  type Province,
  type ProvinceDef,
} from "@/lib/config/provinces";

export function coarse(
  value: number,
  rand: () => number = Math.random,
): number {
  const jitter = (rand() - 0.5) * 0.1; // ±0.05
  return Math.round((Math.round(value * 10) / 10 + jitter) * 100) / 100;
}

/** Nearest province centre (equirectangular distance is plenty at this scale). */
export function nearestProvince(lat: number, lng: number): Province {
  let best: ProvinceDef = PROVINCE_LIST[0];
  let bestD = Infinity;
  const k = Math.cos((lat * Math.PI) / 180);
  for (const p of PROVINCE_LIST) {
    const d = (p.lat - lat) ** 2 + ((p.lng - lng) * k) ** 2;
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best.slug as Province;
}

export type CoarseGeo = {
  country: string | null;
  province: Province | null;
  lat: number | null;
  lng: number | null;
};

/** From raw edge values (strings or undefined) to what the client may know. */
export function coarseGeo(
  raw: { country?: string; latitude?: string; longitude?: string },
  rand: () => number = Math.random,
): CoarseGeo {
  const country =
    raw.country && /^[A-Z]{2}$/.test(raw.country) ? raw.country : null;
  const lat = Number(raw.latitude);
  const lng = Number(raw.longitude);
  const ok =
    raw.latitude !== undefined &&
    raw.longitude !== undefined &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180;
  return {
    country,
    province: ok && country === "TH" ? nearestProvince(lat, lng) : null,
    lat: ok ? coarse(lat, rand) : null,
    lng: ok ? coarse(lng, rand) : null,
  };
}
