import { NextResponse } from "next/server";
import { feedPage } from "@/lib/data/feed";
import { parseFeedFilters } from "@/lib/feed";

// Phase 10c "โหลดเพิ่ม": the next page of /feed for the same filters. Personal (my likes, my
// follows), so never cached.

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const filters = parseFeedFilters(Object.fromEntries(sp));
  const cursor = sp.get("cursor")?.slice(0, 40) || null;
  try {
    const page = await feedPage(filters, cursor, Date.now());
    return NextResponse.json(page, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}
