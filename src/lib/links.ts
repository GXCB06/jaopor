// Project links (migration projects_links_traction). One pasted link is enough to list a project:
// a website, an App Store / Google Play page, a LINE OA, or a GitHub repo. The regexes mirror the
// DB CHECK constraints so the form can reject a link before Postgres does.

export const LINK_KINDS = [
  "website",
  "app_store",
  "play_store",
  "line",
  "github",
] as const;
export type LinkKind = (typeof LINK_KINDS)[number];

export const LINK_COLUMN = {
  website: "website_url",
  app_store: "app_store_url",
  play_store: "play_store_url",
  line: "line_url",
  github: "github_url",
} as const satisfies Record<LinkKind, string>;
export type LinkColumn = (typeof LINK_COLUMN)[LinkKind];

const PATTERN: Record<LinkKind, RegExp> = {
  website: /^https?:\/\/.+/,
  app_store: /^https:\/\/apps\.apple\.com\//,
  play_store: /^https:\/\/play\.google\.com\/store\/apps\/details\?id=/,
  line: /^https:\/\/(lin\.ee|line\.me|page\.line\.me)\//,
  github:
    /^https:\/\/github\.com\/[A-Za-z0-9-]{1,39}(\/[A-Za-z0-9._-]{1,100})?\/?$/,
};

export const LOOKING_FOR = [
  "users",
  "feedback",
  "testers",
  "cofounder",
  "buyer",
  "investor",
] as const;
export type LookingFor = (typeof LOOKING_FOR)[number];

/** "yourstartup.com" → "https://yourstartup.com"; "@myshop" (LINE ID) → LINE add-friend link. */
export function normalizeUrl(input: string): string {
  const v = input.trim();
  if (/^@[A-Za-z0-9._-]{2,40}$/.test(v)) return `https://line.me/R/ti/p/${v}`;
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
}

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** Which kind of link this is, by host. Anything unrecognised is a website. */
export function detectLinkKind(url: string): LinkKind {
  const host = hostOf(url);
  if (host === "apps.apple.com") return "app_store";
  if (host === "play.google.com") return "play_store";
  if (host === "lin.ee" || host === "line.me" || host === "page.line.me")
    return "line";
  if (host === "github.com") return "github";
  return "website";
}

/**
 * Pages on someone else's platform (UX master audit A1.2). They are stored like a website (the only
 * column for a general link) but they are **not the project's own site**: no auto-fill from the
 * page, no JaoPor visitor counter, no owner check, no analytics domain. Detected by host, so every
 * place that reads a stored link agrees without a stored flag.
 */
export const LINK_PLATFORMS = [
  "facebook",
  "instagram",
  "tiktok",
  "youtube",
  "x",
  "threads",
  "linkedin",
  "linktree",
  "notion",
  "google_docs",
  "google_sites",
  "testflight",
  "line_liff",
] as const;
export type LinkPlatform = (typeof LINK_PLATFORMS)[number];

const PLATFORM_HOSTS: ReadonlyArray<readonly [RegExp, LinkPlatform]> = [
  [/(^|\.)facebook\.com$|^fb\.(com|me|watch)$/, "facebook"],
  [/(^|\.)instagram\.com$|^instagr\.am$/, "instagram"],
  [/(^|\.)tiktok\.com$/, "tiktok"],
  [/(^|\.)youtube\.com$|^youtu\.be$/, "youtube"],
  [/^(mobile\.)?(x|twitter)\.com$/, "x"],
  [/^threads\.(net|com)$/, "threads"],
  [/(^|\.)linkedin\.com$|^lnkd\.in$/, "linkedin"],
  [/^linktr\.ee$/, "linktree"],
  [/(^|\.)notion\.(site|so)$/, "notion"],
  [/^(docs|drive|forms)\.google\.com$/, "google_docs"],
  [/^sites\.google\.com$/, "google_sites"],
  [/^testflight\.apple\.com$/, "testflight"],
  [/^liff\.line\.me$/, "line_liff"],
];

/** Link shorteners hide where a link goes (and break duplicate checks): we ask for the full link. */
const SHORT_LINK_HOSTS = new Set([
  "bit.ly",
  "tinyurl.com",
  "t.co",
  "t.ly",
  "shorturl.at",
  "cutt.ly",
  "rebrand.ly",
  "rb.gy",
  "is.gd",
  "ow.ly",
  "s.id",
  "goo.gl",
]);

/** The platform a website-kind link belongs to, or null for an ordinary (own) website. */
export function linkPlatform(
  url: string | null | undefined,
): LinkPlatform | null {
  if (!url?.trim()) return null;
  const host = hostOf(normalizeUrl(url));
  if (!host) return null;
  return PLATFORM_HOSTS.find(([re]) => re.test(host))?.[1] ?? null;
}

export function isShortLink(url: string): boolean {
  const host = hostOf(normalizeUrl(url));
  return host !== null && SHORT_LINK_HOSTS.has(host);
}

/**
 * True when the link is the project's own website: the only kind of link our visitor counter,
 * owner check, auto-fill and analytics domain matching can work with.
 */
export function isOwnWebsite(url: string | null | undefined): boolean {
  if (!url?.trim()) return false;
  const u = normalizeUrl(url);
  return (
    hostOf(u) !== null &&
    detectLinkKind(u) === "website" &&
    !linkPlatform(u) &&
    !isShortLink(u)
  );
}

/** Host of the project's own website, else null (a platform page has no "own" host). */
export function ownWebsiteHost(url: string | null | undefined): string | null {
  return isOwnWebsite(url) ? websiteHost(url ?? null) : null;
}

/** What the type control offers: the stored kinds plus "other" (a platform page). */
export type LinkChoice = LinkKind | "other";
export const LINK_CHOICES: readonly LinkChoice[] = [...LINK_KINDS, "other"];

export type LinkProblem =
  /** bit.ly & co: paste the full link. */
  | "short_link"
  /** Doesn't fit the chosen kind's format (e.g. a Play link that isn't an app page). */
  | "invalid"
  /** A platform page (Facebook…) chosen as the project's own website. */
  | "not_own_site"
  /** "Other" chosen for a domain we don't know: we can't store it as a platform page. */
  | "unknown_platform";

export type LinkCheck =
  | {
      ok: true;
      kind: LinkKind;
      column: LinkColumn;
      url: string;
      platform: LinkPlatform | null;
      /** What we detected before any correction. */
      detected: LinkChoice;
    }
  | {
      ok: false;
      problem: LinkProblem;
      detected: LinkChoice | null;
      /** The kind the link was checked against (the choice, else the detection). */
      expected: LinkChoice | null;
      platform: LinkPlatform | null;
    };

/**
 * Checks a pasted link, optionally against the type the founder chose (A1.2: the detected type can
 * be corrected, never silently assumed). Paths and query strings are kept, except GitHub links,
 * which are trimmed to owner/repo. Null for empty input.
 */
export function checkProjectLink(
  input: string,
  choice?: LinkChoice | null,
): LinkCheck | null {
  if (!input.trim()) return null;
  const normalized = normalizeUrl(input);
  if (isShortLink(normalized))
    return {
      ok: false,
      problem: "short_link",
      detected: null,
      expected: choice ?? null,
      platform: null,
    };
  const detectedKind = detectLinkKind(normalized);
  const platform = detectedKind === "website" ? linkPlatform(normalized) : null;
  const detected: LinkChoice = platform ? "other" : detectedKind;
  const want = choice ?? detected;
  const fail = (problem: LinkProblem): LinkCheck => ({
    ok: false,
    problem,
    detected,
    expected: want,
    platform,
  });

  // "@shop" is read as a LINE ID; for another platform the full link is needed.
  if (input.trim().startsWith("@") && want !== "line") return fail("invalid");

  let kind: LinkKind;
  if (want === "other") {
    // "Other" means a known platform page; a supported link keeps its real kind.
    if (platform) kind = "website";
    else if (detectedKind !== "website") kind = detectedKind;
    else return fail("unknown_platform");
  } else if (want === "website" && platform) {
    return fail("not_own_site");
  } else if (want !== detectedKind) {
    return fail("invalid");
  } else kind = want;

  let url = normalized;
  if (kind === "github") {
    // Keep only github.com/owner[/repo] (drop /tree/main, .git, query strings).
    const m =
      /^https?:\/\/(?:www\.)?github\.com\/([^/?#]+)(?:\/([^/?#]+))?/i.exec(url);
    if (!m) return fail("invalid");
    url = `https://github.com/${m[1]}${m[2] ? `/${m[2].replace(/\.git$/, "")}` : ""}`;
  } else if (kind !== "website") {
    url = url.replace(/^http:\/\//i, "https://").replace("://www.", "://");
  }
  if (url.length > 300 || !PATTERN[kind].test(url) || !hostOf(url))
    return fail("invalid");
  return { ok: true, kind, column: LINK_COLUMN[kind], url, platform, detected };
}

/**
 * Normalizes a pasted link and returns the column to store it in, or null when it can't be stored
 * (malformed for its kind, or a short link). `platform` is set for pages on Facebook & co.
 */
export function parseProjectLink(input: string): {
  kind: LinkKind;
  column: LinkColumn;
  url: string;
  platform: LinkPlatform | null;
} | null {
  const r = checkProjectLink(input);
  return r?.ok
    ? { kind: r.kind, column: r.column, url: r.url, platform: r.platform }
    : null;
}

type WithLinks = { [K in LinkColumn]: string | null };

/** All links of a project, website first. */
export function projectLinks(
  s: WithLinks,
): Array<{ kind: LinkKind; url: string }> {
  return LINK_KINDS.flatMap((kind) => {
    const url = s[LINK_COLUMN[kind]];
    return url ? [{ kind, url }] : [];
  });
}

/** Bare hostname of the website (used to match analytics sites to the project). */
export function websiteHost(url: string | null): string | null {
  return url ? hostOf(url) : null;
}

/** Tracking parameters that never identify a page. */
const TRACKING_PARAM =
  /^(utm_.+|fbclid|gclid|igsh|igshid|si|feature|ref|ref_src|mibextid|_rdr|locale)$/i;

/**
 * Identity of a platform page: host family, path (case-insensitive, no trailing slash) and the
 * query parameters that identify it (`profile.php?id=…`, `watch?v=…`); tracking parameters dropped.
 */
function platformPageKey(url: string): string {
  try {
    const u = new URL(url);
    const params = [...u.searchParams.entries()]
      .filter(([k]) => !TRACKING_PARAM.test(k))
      .sort(([x], [y]) => x.localeCompare(y))
      .map(([k, v]) => `${k.toLowerCase()}=${v}`)
      .join("&");
    const path = u.pathname.replace(/\/+$/, "").toLowerCase();
    return `${path}?${params}`;
  } catch {
    return url;
  }
}

/** Path without trailing slash; "" for the site root or a bare language root ("/th", "/en"). */
function sitePath(url: string): string {
  try {
    const p = new URL(url).pathname.replace(/\/+$/, "").toLowerCase();
    return /^\/[a-z]{2}$/.test(p) ? "" : p;
  } catch {
    return "";
  }
}

/**
 * The same website, for "one business, one listing" (UX review 2026-10-07: one site was listed
 * twice and its revenue counted twice). Same host (`www.` and case ignored); paths count only when
 * both are specific, so `you.github.io/app-a` and `you.github.io/app-b` stay different projects,
 * while `jaopor.vercel.app` and `jaopor.vercel.app/th` are the same.
 */
export function sameWebsite(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  if (!a?.trim() || !b?.trim()) return false;
  const ua = normalizeUrl(a);
  const ub = normalizeUrl(b);
  // Platform pages (A1.2): two pages on Facebook are different businesses unless they are the
  // same page, so compare the page itself (path + identifying query), not the shared host.
  const platA = linkPlatform(ua);
  const platB = linkPlatform(ub);
  if (platA || platB)
    return platA === platB && platformPageKey(ua) === platformPageKey(ub);
  const ha = hostOf(ua);
  if (!ha || ha !== hostOf(ub)) return false;
  const pa = sitePath(ua);
  const pb = sitePath(ub);
  return !pa || !pb || pa === pb;
}
