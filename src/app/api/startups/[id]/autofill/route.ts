import { NextResponse } from "next/server";
import { geminiJson } from "@/lib/ai/gemini";
import {
  DRAFT_SCHEMA,
  buildPrompt,
  extractPage,
  heuristicDraft,
  parseDraft,
  type AutofillDraft,
} from "@/lib/autofill";
import { fetchHtml } from "@/lib/net/link-preview";
import { createClient } from "@/lib/supabase/server";

// Design.md §5 Edit page "✨ ช่วยเติมจากเว็บไซต์": owner-only. Reads the project's public website
// (+ public GitHub README) and returns a draft; nothing is saved here, the owner reviews it in
// the form first. Uses the free Gemini key when set, else the page's own metadata.

const MAX_HTML = 1_500_000;
const lastCall = new Map<string, number>(); // per-instance throttle (one call / 10 s / user)

/** The page's HTML through the shared SSRF guard (IP checked at connect time, redirects re-checked). */
async function fetchSite(raw: string): Promise<string | null> {
  const page = await fetchHtml(raw, AbortSignal.timeout(8000), MAX_HTML);
  return page?.html ?? null;
}

async function fetchReadme(repo: string | null): Promise<string | null> {
  if (!repo || !/^[A-Za-z0-9-]{1,39}\/[A-Za-z0-9._-]{1,100}$/.test(repo))
    return null;
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/readme`, {
      headers: {
        accept: "application/vnd.github.raw",
        "user-agent": "JaoPor-autofill",
      },
      signal: AbortSignal.timeout(6000),
    });
    return res.ok ? (await res.text()).slice(0, 6000) : null;
  } catch {
    return null;
  }
}

export async function POST(
  req: Request,
  ctx: RouteContext<"/api/startups/[id]/autofill">,
) {
  const id = Number((await ctx.params).id);
  if (!Number.isSafeInteger(id) || id <= 0)
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  const { locale } = (await req.json().catch(() => ({}))) as {
    locale?: string;
  };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: startup } = await supabase
    .from("startups")
    .select("website_url, github_repo")
    .eq("id", id)
    .eq("owner_id", auth.user.id)
    .maybeSingle();
  if (!startup)
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!startup.website_url)
    return NextResponse.json({ error: "no_website" }, { status: 400 });

  const now = Date.now();
  if (now - (lastCall.get(auth.user.id) ?? 0) < 10_000)
    return NextResponse.json({ error: "slow_down" }, { status: 429 });
  lastCall.set(auth.user.id, now);

  let html: string | null;
  try {
    html = await fetchSite(startup.website_url);
  } catch {
    html = null;
  }
  if (!html)
    return NextResponse.json({ error: "site_unreachable" }, { status: 502 });

  const page = extractPage(html);
  const readme = await fetchReadme(startup.github_repo);
  const ai = await geminiJson(
    buildPrompt(page, readme, locale === "en" ? "en" : "th"),
    DRAFT_SCHEMA,
  );
  const aiDraft = ai ? parseDraft(ai) : {};
  // The AI draft wins field by field; the page's own metadata fills whatever it left out.
  const draft: AutofillDraft = { ...heuristicDraft(page), ...aiDraft };
  return NextResponse.json({ draft, source: ai ? "ai" : "page" });
}
