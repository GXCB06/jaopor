import { geolocation } from "@vercel/functions";
import { NextResponse } from "next/server";
import { coarseGeo } from "@/lib/live/geo";

// Phase 8: the visitor's own coarse location for the live map (country, nearest Thai province,
// rounded + jittered coordinates). Read from Vercel's edge headers; the IP is never read here.
// Locally (no Vercel headers) every field is null.
export function GET(req: Request) {
  return NextResponse.json(coarseGeo(geolocation(req)), {
    headers: { "Cache-Control": "private, no-store" },
  });
}
