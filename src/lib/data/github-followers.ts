import "server-only";
import { githubLoginOf } from "@/lib/data/connections";
import { serverEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

// Design.md §6 Builder profile key cards, card 3: GitHub followers, shown only when the GitHub
// account the builder lists on their profile is the one they sign in with, so the number is
// theirs. Public data from GitHub's API, cached a day. X followers aren't offered (paid API).

/** "github.com/Login", "https://github.com/Login/", "@Login" or "Login" → "login"; else null. */
export function githubLoginFromLink(
  v: string | null | undefined,
): string | null {
  const s = v?.trim();
  if (!s) return null;
  const m =
    s.match(
      /^(?:https?:\/\/)?(?:www\.)?github\.com\/([A-Za-z0-9-]{1,39})\/?(?:[?#].*)?$/i,
    ) ?? s.match(/^@?([A-Za-z0-9-]{1,39})$/);
  return m ? m[1].toLowerCase() : null;
}

type Deps = {
  /** The GitHub login of the account this user signs in with (null if none). */
  signInLogin: (userId: string) => Promise<string | null>;
  fetchImpl: typeof fetch;
  token?: string;
};

const defaultDeps = (): Deps => ({
  signInLogin: async (userId) => {
    const { data } = await createAdminClient().auth.admin.getUserById(userId);
    return data.user ? githubLoginOf(data.user) : null;
  },
  fetchImpl: fetch,
  token: serverEnv.githubToken(),
});

export async function verifiedGithubFollowers(
  userId: string,
  publicLink: string | null | undefined,
  deps: Deps = defaultDeps(),
): Promise<{ login: string; followers: number } | null> {
  const listed = githubLoginFromLink(publicLink);
  if (!listed) return null;
  try {
    const own = (await deps.signInLogin(userId))?.toLowerCase();
    if (own !== listed) return null;
    const res = await deps.fetchImpl(`https://api.github.com/users/${listed}`, {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "JaoPor-profile",
        ...(deps.token ? { Authorization: `Bearer ${deps.token}` } : {}),
      },
      signal: AbortSignal.timeout(5000),
      next: { revalidate: 86400 },
    } as RequestInit);
    if (!res.ok) return null;
    const body = (await res.json()) as { login?: string; followers?: unknown };
    return typeof body.followers === "number"
      ? { login: body.login ?? listed, followers: body.followers }
      : null;
  } catch {
    return null;
  }
}
