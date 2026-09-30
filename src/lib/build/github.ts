// GitHub build proof: "2 weeks, 700 commits, built with Claude" as verified numbers instead of
// a claim in a comment. Public repos only, read through our own (optional) token: founders
// share no credential. Ownership: the repo owner must be the founder's GitHub login (from their
// GitHub sign-in), or an organisation where that login is a public member.
import { matchStackLabel } from "@/lib/config/stack";
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

// ---------------------------------------------------------------------------
// Tech stack detection (Design.md §5 InsightsGrid "Detected from GitHub")
// ---------------------------------------------------------------------------

/**
 * Dependency / file → display label. Labels are the `label`s in src/lib/config/stack.ts so the
 * edit form can turn them into stack slugs (matchStackLabel). Order = display order.
 */
const NPM_STACK: Array<[RegExp, string]> = [
  [/^next$/, "Next.js"],
  [/^nuxt$/, "Nuxt"],
  [/^@remix-run\//, "Remix"],
  [/^astro$/, "Astro"],
  [/^@sveltejs\/kit$/, "SvelteKit"],
  [/^solid-js$/, "SolidJS"],
  [/^gatsby$/, "Gatsby"],
  [/^expo$/, "Expo"],
  [/^react-native$/, "React Native"],
  [/^react$/, "React"],
  [/^vue$/, "Vue"],
  [/^svelte$/, "Svelte"],
  [/^@angular\/core$/, "Angular"],
  [/^electron$/, "Electron"],
  [/^@tauri-apps\//, "Tauri"],
  [/^@ionic\//, "Ionic"],
  [/^@capacitor\/core$/, "Capacitor"],
  [/^vite$/, "Vite"],
  [/^jquery$/, "jQuery"],
  [/^bootstrap$/, "Bootstrap"],
  [/^@mui\/material$/, "MUI"],
  [/^sass$/, "Sass"],
  [/^three$/, "Three.js"],
  [/^(@reduxjs\/toolkit|redux)$/, "Redux"],
  [/^tailwindcss$/, "Tailwind CSS"],
  [/^express$/, "Express"],
  [/^hono$/, "Hono"],
  [/^@nestjs\/core$/, "NestJS"],
  [/^graphql$/, "GraphQL"],
  [/^@trpc\/server$/, "tRPC"],
  [/^@supabase\/supabase-js$/, "Supabase"],
  [/^firebase(-admin)?$/, "Firebase"],
  [/^appwrite$/, "Appwrite"],
  [/^pocketbase$/, "PocketBase"],
  [/^convex$/, "Convex"],
  [/^@prisma\/client$|^prisma$/, "Prisma"],
  [/^drizzle-orm$/, "Drizzle"],
  [/^(pg|postgres)$/, "PostgreSQL"],
  [/^(mysql2?|mysql)$/, "MySQL"],
  [/^mongoose$|^mongodb$/, "MongoDB"],
  [/^(redis|ioredis)$/, "Redis"],
  [/^@upstash\//, "Upstash"],
  [/^@neondatabase\//, "Neon"],
  [/^@libsql\/client$/, "Turso"],
  [/^@pinecone-database\//, "Pinecone"],
  [/^@clerk\//, "Clerk"],
  [/^(@auth0\/|auth0$)/, "Auth0"],
  [/^resend$/, "Resend"],
  [/^@sendgrid\//, "SendGrid"],
  [/^twilio$/, "Twilio"],
  [/^@sentry\//, "Sentry"],
  [/^posthog-(js|node)$/, "PostHog"],
  [/^mixpanel/, "Mixpanel"],
  [/^algoliasearch$/, "Algolia"],
  [/^meilisearch$/, "Meilisearch"],
  [/^stripe$|^@stripe\//, "Stripe"],
  [/^@paypal\//, "PayPal"],
  [/^omise$/, "Omise"],
  [/^xendit-node$/, "Xendit"],
  [/^@line\/bot-sdk$/, "LINE Messaging API"],
  [/^@anthropic-ai\/sdk$/, "Claude"],
  [/^openai$/, "OpenAI"],
  [/^@google\/(genai|generative-ai)$/, "Gemini"],
  [/^@mistralai\//, "Mistral"],
  [/^ollama$/, "Ollama"],
  [/^langchain$|^@langchain\//, "LangChain"],
  [/^elevenlabs$|^@elevenlabs\//, "ElevenLabs"],
  [/^ai$/, "Vercel AI SDK"],
];

/** Python packages (requirements.txt / pyproject.toml) → labels. */
const PY_STACK: Array<[RegExp, string]> = [
  [/^django$/, "Django"],
  [/^fastapi$/, "FastAPI"],
  [/^flask$/, "Flask"],
  [/^(psycopg2?(-binary)?|asyncpg)$/, "PostgreSQL"],
  [/^pymongo$/, "MongoDB"],
  [/^redis$/, "Redis"],
  [/^supabase$/, "Supabase"],
  [/^firebase-admin$/, "Firebase"],
  [/^stripe$/, "Stripe"],
  [/^anthropic$/, "Claude"],
  [/^openai$/, "OpenAI"],
  [/^google-(genai|generativeai)$/, "Gemini"],
  [/^langchain/, "LangChain"],
  [/^line-bot-sdk$/, "LINE Messaging API"],
  [/^sentry-sdk$/, "Sentry"],
];

/** Root files / folders → labels (hosting and platforms that leave a config file behind). */
const ROOT_FILE_STACK: Array<[RegExp, string]> = [
  [/^vercel\.json$/, "Vercel"],
  [/^netlify\.toml$/, "Netlify"],
  [/^(wrangler\.toml|wrangler\.jsonc?)$/, "Cloudflare"],
  [/^fly\.toml$/, "Fly.io"],
  [/^railway\.(json|toml)$/, "Railway"],
  [/^render\.yaml$/, "Render"],
  [/^(firebase\.json|\.firebaserc)$/, "Firebase"],
  [/^supabase$/, "Supabase"],
  [/^(Dockerfile|docker-compose\.ya?ml|compose\.ya?ml)$/, "Docker"],
  [/^Procfile$/, "Heroku"],
  [/^app\.json$/, "Expo"],
  [/^angular\.json$/, "Angular"],
  [/^astro\.config\.(mjs|ts|js)$/, "Astro"],
  [/^svelte\.config\.js$/, "Svelte"],
];

/** GitHub language → stack label where they differ. */
const LANGUAGE_LABEL: Record<string, string> = {
  HTML: "HTML / CSS",
  CSS: "HTML / CSS",
  SCSS: "Sass",
  PLpgSQL: "PostgreSQL",
};
/** Build noise that says nothing about the product. */
const SKIP_LANGUAGES = [
  "Shell",
  "Dockerfile",
  "Makefile",
  "Batchfile",
  "PowerShell",
];

const MAX_STACK = 20;

export type StackManifests = {
  packageJson?: string | null;
  requirements?: string | null;
  pyproject?: string | null;
  composer?: string | null;
  gemfile?: string | null;
  pubspec?: string | null;
  goMod?: string | null;
  /** Names of the files/folders in the repo root. */
  rootFiles?: string[];
};

/** Pure: languages (bytes per language) + package.json text (+ other manifests) → stack labels. */
export function stackFrom(
  languages: Record<string, number>,
  packageJsonOrManifests: string | null | StackManifests,
): string[] {
  const m: StackManifests =
    typeof packageJsonOrManifests === "string" ||
    packageJsonOrManifests === null
      ? { packageJson: packageJsonOrManifests }
      : packageJsonOrManifests;
  const out: string[] = [];
  const add = (label: string) => {
    if (!out.includes(label) && out.length < MAX_STACK) out.push(label);
  };
  const applyAll = (names: string[], table: Array<[RegExp, string]>) => {
    for (const [re, label] of table)
      if (names.some((d) => re.test(d))) add(label);
  };

  if (m.packageJson) {
    try {
      const pkg = JSON.parse(m.packageJson) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      applyAll(
        Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }),
        NPM_STACK,
      );
    } catch {
      // Not valid JSON: skip it.
    }
  }
  const py = [
    ...(m.requirements ?? "").split("\n").map((l) =>
      l
        .split(/[<>=~!;[\s#]/)[0]
        .trim()
        .toLowerCase(),
    ),
    ...[
      ...(m.pyproject ?? "").matchAll(/["']([A-Za-z0-9_.-]+)\s*[<>=~!\[;"']/g),
    ].map((x) => x[1].toLowerCase()),
  ].filter(Boolean);
  if (py.length) applyAll(py, PY_STACK);
  if (m.composer && /"laravel\/framework"/.test(m.composer)) add("Laravel");
  if (m.gemfile && /gem ["']rails["']/.test(m.gemfile)) add("Rails");
  if (m.pubspec && /^\s*flutter:/m.test(m.pubspec)) add("Flutter");
  if (m.goMod) add("Go");
  if (m.rootFiles?.length) applyAll(m.rootFiles, ROOT_FILE_STACK);

  // Top languages by size, at most 5. Only languages in our stack vocabulary, except the main
  // one (so Procfile, CMake, Jinja… don't show up, but an Elm or Haskell app still says so).
  Object.entries(languages)
    .filter(([lang]) => !SKIP_LANGUAGES.includes(lang))
    .sort((a, b) => b[1] - a[1])
    .map(([lang]) => LANGUAGE_LABEL[lang] ?? lang)
    .filter(
      (label, idx) =>
        idx === 0 ||
        (label !== "HTML / CSS" && label !== "Sass" && matchStackLabel(label)),
    )
    .slice(0, 5)
    .forEach(add);
  return out;
}

/**
 * True only for an existing *public* repo. The server token can also read its owner's private
 * repos, so on-demand detection for arbitrary repo names must check this first.
 */
export async function isPublicRepo(
  repo: string,
  token?: string,
  fetchImpl: Fetch = fetch,
): Promise<boolean> {
  const res = await gh(fetchImpl, `/repos/${repo}`, token);
  if (!res.ok) return false;
  const body = (await res.json()) as { private?: boolean };
  return body.private === false;
}

const MANIFESTS: Array<[keyof StackManifests, string]> = [
  ["packageJson", "package.json"],
  ["requirements", "requirements.txt"],
  ["pyproject", "pyproject.toml"],
  ["composer", "composer.json"],
  ["gemfile", "Gemfile"],
  ["pubspec", "pubspec.yaml"],
  ["goMod", "go.mod"],
];

async function fileText(
  fetchImpl: Fetch,
  repo: string,
  path: string,
  token?: string,
): Promise<string | null> {
  const res = await gh(fetchImpl, `/repos/${repo}/contents/${path}`, token);
  if (!res.ok) return null;
  const body = (await res.json()) as {
    content?: string;
    encoding?: string;
    size?: number;
  };
  return body.encoding === "base64" &&
    body.content &&
    (body.size ?? 0) < 200_000
    ? Buffer.from(body.content, "base64").toString("utf8")
    : null;
}

/**
 * Languages + root listing + the manifests that exist (package.json, requirements.txt, …) of a
 * public repo → stack labels (empty on any failure). 2 calls + one per manifest present.
 */
export async function detectStack(
  repo: string,
  token?: string,
  fetchImpl: Fetch = fetch,
): Promise<string[]> {
  try {
    const [langRes, rootRes] = await Promise.all([
      gh(fetchImpl, `/repos/${repo}/languages`, token),
      gh(fetchImpl, `/repos/${repo}/contents/`, token),
    ]);
    const languages = langRes.ok
      ? ((await langRes.json()) as Record<string, number>)
      : {};
    const root = rootRes.ok
      ? ((await rootRes.json()) as { name?: string }[])
      : [];
    const rootFiles = Array.isArray(root)
      ? root.map((f) => f.name ?? "").filter(Boolean)
      : [];
    const manifests: StackManifests = { rootFiles };
    await Promise.all(
      MANIFESTS.filter(([, file]) => rootFiles.includes(file)).map(
        async ([key, file]) => {
          (manifests as Record<string, unknown>)[key] = await fileText(
            fetchImpl,
            repo,
            file,
            token,
          );
        },
      ),
    );
    return stackFrom(languages, manifests);
  } catch (err) {
    if (err instanceof ProviderError && err.code === "rate_limited") throw err;
    return [];
  }
}

type CommitItem = {
  commit?: { author?: { date?: string }; committer?: { date?: string } };
};

function commitDate(c: CommitItem | undefined): string | null {
  const d = c?.commit?.author?.date ?? c?.commit?.committer?.date;
  return d && !Number.isNaN(Date.parse(d)) ? new Date(d).toISOString() : null;
}
