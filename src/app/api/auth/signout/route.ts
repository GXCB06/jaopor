import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const url = new URL(request.url);
  if (origin && new URL(origin).host !== url.host) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", url.origin), { status: 303 });
}
