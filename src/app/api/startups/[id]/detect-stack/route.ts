import { NextResponse } from "next/server";
import { detectStack, isPublicRepo, parseRepo } from "@/lib/build/github";
import { serverEnv } from "@/lib/env";
import { ProviderError } from "@/lib/revenue/types";
import { createClient } from "@/lib/supabase/server";

// Design.md §5 Edit page "ดึงจาก GitHub": owner-only. Reads a *public* repo's languages, root files
// and manifests (package.json, requirements.txt, …) and returns stack labels. Nothing is saved
// here; the owner adds the suggestions in the form. Works without connecting build proof.

const lastCall = new Map<string, number>(); // per-instance throttle (one call / 5 s / user)

export async function POST(
  req: Request,
  ctx: RouteContext<"/api/startups/[id]/detect-stack">,
) {
  const id = Number((await ctx.params).id);
  if (!Number.isSafeInteger(id) || id <= 0)
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  const { repo: raw } = (await req.json().catch(() => ({}))) as {
    repo?: unknown;
  };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: startup } = await supabase
    .from("startups")
    .select("github_url, github_repo")
    .eq("id", id)
    .eq("owner_id", auth.user.id)
    .maybeSingle();
  if (!startup)
    return NextResponse.json({ error: "not_found" }, { status: 404 });

  // The form's current GitHub link (may be unsaved), else the saved link / verified repo.
  const repo = [raw, startup.github_url, startup.github_repo]
    .map((v) => (typeof v === "string" && v ? parseRepo(v) : null))
    .find(Boolean);
  if (!repo) return NextResponse.json({ error: "no_repo" }, { status: 400 });

  const now = Date.now();
  if (now - (lastCall.get(auth.user.id) ?? 0) < 5_000)
    return NextResponse.json({ error: "slow_down" }, { status: 429 });
  lastCall.set(auth.user.id, now);

  const token = serverEnv.githubToken();
  try {
    if (!(await isPublicRepo(repo, token)))
      return NextResponse.json({ error: "repo_not_found" }, { status: 404 });
    const labels = await detectStack(repo, token);
    return NextResponse.json({ repo, labels });
  } catch (err) {
    if (err instanceof ProviderError && err.code === "rate_limited")
      return NextResponse.json({ error: "slow_down" }, { status: 429 });
    return NextResponse.json({ error: "failed" }, { status: 502 });
  }
}
