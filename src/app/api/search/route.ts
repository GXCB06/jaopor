import { NextResponse } from "next/server";
import { popularStartups, searchStartups } from "@/lib/data/startups";
import { searchCategories, searchProvinces } from "@/lib/search-text";
import { SOURCE_NAME, isSource } from "@/lib/sources/catalog";
import { logoUrl } from "@/lib/supabase/public";

// Spec 6.8 QuickSearch backend: startups (RPC search_startups, published only) + categories and
// provinces (matched from src/lib/config). Empty q → "ยอดนิยม" (popular startups).
// Public data only, so it is cacheable at the edge for a short time.

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const q = (sp.get("q") ?? "").trim().slice(0, 60);
  const locale = sp.get("locale") === "en" ? "en" : "th";
  try {
    const startups = q ? await searchStartups(q, 6) : await popularStartups(5);
    return NextResponse.json(
      {
        q,
        startups: startups.map((s) => ({
          ...s,
          logo: logoUrl(s.logo_path),
          source:
            s.verified && isSource(s.provider) ? SOURCE_NAME[s.provider] : null,
        })),
        categories: q ? searchCategories(q, locale) : [],
        provinces: q ? searchProvinces(q, locale) : [],
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
        },
      },
    );
  } catch {
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}
