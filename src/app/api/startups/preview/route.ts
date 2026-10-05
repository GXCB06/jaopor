import { NextResponse } from "next/server";
import { parseProjectLink } from "@/lib/links";
import { getSiteAutofill } from "@/lib/net/link-preview";
import { createClient } from "@/lib/supabase/server";

// Design.md §5 Add-startup wizard v2: signed-in users only. Reads the website they just pasted
// (SSRF-guarded, see getSiteAutofill) and returns name, one-liner and logo to pre-fill step 1.
// Nothing is saved here; the wizard shows the values in editable fields.

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 20; // per-instance throttle: typing a link triggers a few debounced calls
const calls = new Map<string, number[]>();

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const now = Date.now();
  const recent = (calls.get(auth.user.id) ?? []).filter(
    (t) => now - t < WINDOW_MS,
  );
  if (recent.length >= MAX_PER_WINDOW)
    return NextResponse.json({ error: "slow_down" }, { status: 429 });
  if (calls.size > 1000) calls.clear();
  calls.set(auth.user.id, [...recent, now]);

  const { link } = (await req.json().catch(() => ({}))) as { link?: unknown };
  const parsed = typeof link === "string" ? parseProjectLink(link) : null;
  if (!parsed || parsed.kind !== "website")
    return NextResponse.json({ error: "not_website" }, { status: 400 });

  const site = await getSiteAutofill(parsed.url);
  if (!site)
    return NextResponse.json({ error: "site_unreachable" }, { status: 502 });
  return NextResponse.json(site, {
    headers: { "cache-control": "private, no-store" },
  });
}
