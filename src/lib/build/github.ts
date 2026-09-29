// GitHub build proof: "2 weeks, 700 commits, built with Claude" as verified numbers instead of
// a claim in a comment. Public repos only, read through our own (optional) token: founders
// share no credential. Ownership: the repo owner must be the founder's GitHub login (from their
// GitHub sign-in), or an organisation where that login is a public member.
import { ProviderError } from "@/lib/revenue/types";

const API = "https://api.github.com";
const REPO_FORMAT = /^([A-Za-z0-9-]{1,39})\/([A-Za-z0-9._-]{1,100})$/;

type Fetch = typeof fetch;

export type BuildProof = {
  repo: string; // canonical "owner/name" (GitHub's casing)
  firstCommitAt: string | null;
  commits: number;
  /** Commits whose message carries "Co-Authored-By: Claude" (Claude Code's trailer). */
  aiCommits: number;
  stars: number;
};

/** "https://github.com/me/app" or "me/app" → "me/app". */
export function parseRepo(input: string): string | null {
  const v = input
    .trim()
    .replace(/^https?:\/\/(www\.)?github\.com\//i, "")
    .replace(/\.git$/, "")
    .replace(/\/+$/, "");
  const m = REPO_FORMAT.exec(v);
  return m ? `${m[1]}/${m[2]}` : null;
}

/** Page count from a `Link: <...&page=42>; rel="last"` header (null when there's one page). */
export function lastPage(link: string | null): number | null {
  const m = link && /[?&]page=(\d+)[^>]*>;\s*rel="last"/.exec(link);
  return m ? Number(m[1]) : null;
}

function headers(token?: string): HeadersInit {
  return {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "JaoPor-build-proof",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function gh(
  fetchImpl: Fetch,
  path: string,
  token?: string,
): Promise<Response> {
  const res = await fetchImpl(`${API}${path}`, {
    headers: headers(token),
    signal: AbortSignal.timeout(15_000),
  });
  if (res.status === 403 || res.status === 429) {
    if (res.headers.get("x-ratelimit-remaining") === "0" || res.status === 429)
      throw new ProviderError("rate_limited", "GitHub is rate-limiting us.");
  }
  return res;
}

/** Throws unless `login` owns the repo (user repo) or is a public member of the owning org. */
export async function assertRepoOwner(
  repo: string,
  login: string,
  token?: string,
  fetchImpl: Fetch = fetch,
): Promise<void> {
  const res = await gh(fetchImpl, `/repos/${repo}`, token);
  if (res.status === 404)
    throw new ProviderError(
      "not_found",
      "Repo not found. It must be public (private repos come later).",
    );
  if (!res.ok)
    throw new ProviderError(
      "upstream",
      `GitHub responded with HTTP ${res.status}.`,
    );
  const body = (await res.json()) as {
    private?: boolean;
    owner?: { login?: string; type?: string };
  };
  if (body.private)
    throw new ProviderError(
      "not_found",
      "Only public repos can be verified for now.",
    );
  const owner = body.owner?.login ?? "";
  if (owner.toLowerCase() === login.toLowerCase()) return;
  if (body.owner?.type === "Organization") {
    const member = await gh(
      fetchImpl,
      `/orgs/${encodeURIComponent(owner)}/public_members/${encodeURIComponent(login)}`,
      token,
    );
    if (member.status === 204) return;
  }
  throw new ProviderError(
    "not_owner",
    `This repo belongs to ${owner}, not to your GitHub account (${login}). For an organisation repo, make your membership public.`,
  );
}

export async function fetchBuildProof(
  repoInput: string,
  token?: string,
  fetchImpl: Fetch = fetch,
): Promise<BuildProof> {
  const repo = parseRepo(repoInput);
  if (!repo) throw new ProviderError("not_found", "Paste a GitHub repo link.");

  const info = await gh(fetchImpl, `/repos/${repo}`, token);
  if (info.status === 404)
    throw new ProviderError("not_found", "Repo not found or not public.");
  if (!info.ok)
    throw new ProviderError(
      "upstream",
      `GitHub responded with HTTP ${info.status}.`,
    );
  const meta = (await info.json()) as {
    full_name?: string;
    stargazers_count?: number;
  };
  const canonical = meta.full_name ?? repo;

  // Commits on the default branch: with per_page=1 the last page number IS the commit count,
  // and that last page holds the very first commit.
  const first = await gh(
    fetchImpl,
    `/repos/${canonical}/commits?per_page=1`,
    token,
  );
  let commits = 0;
  let firstCommitAt: string | null = null;
  if (first.status === 409) {
    // Empty repository.
  } else if (!first.ok) {
    throw new ProviderError(
      "upstream",
      `GitHub responded with HTTP ${first.status}.`,
    );
  } else {
    const pages = lastPage(first.headers.get("link"));
    const page1 = (await first.json()) as CommitItem[];
    commits = pages ?? page1.length;
    let oldest = page1;
    if (pages && pages > 1) {
      const last = await gh(
        fetchImpl,
        `/repos/${canonical}/commits?per_page=1&page=${pages}`,
        token,
      );
      if (last.ok) oldest = (await last.json()) as CommitItem[];
    }
    firstCommitAt = commitDate(oldest[0]);
  }

  // Commit search matches the message text (Claude Code adds "Co-Authored-By: Claude …").
  let aiCommits = 0;
  const search = await gh(
    fetchImpl,
    `/search/commits?q=${encodeURIComponent(`repo:${canonical} "Co-Authored-By: Claude"`)}&per_page=1`,
    token,
  );
  if (search.ok)
    aiCommits =
      ((await search.json()) as { total_count?: number }).total_count ?? 0;

  return {
    repo: canonical,
    firstCommitAt,
    commits,
    aiCommits: Math.min(aiCommits, commits || aiCommits),
    stars: meta.stargazers_count ?? 0,
  };
}

type CommitItem = {
  commit?: { author?: { date?: string }; committer?: { date?: string } };
};

function commitDate(c: CommitItem | undefined): string | null {
  const d = c?.commit?.author?.date ?? c?.commit?.committer?.date;
  return d && !Number.isNaN(Date.parse(d)) ? new Date(d).toISOString() : null;
}
