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
 * Normalizes a pasted link and returns the column to store it in, or null when the link is
 * recognised but malformed (e.g. a Play link that isn't an app page).
 */
export function parseProjectLink(
  input: string,
): { kind: LinkKind; column: LinkColumn; url: string } | null {
  if (!input.trim()) return null;
  let url = normalizeUrl(input);
  const kind = detectLinkKind(url);
  if (kind === "github") {
    // Keep only github.com/owner[/repo] (drop /tree/main, .git, query strings).
    const m =
      /^https?:\/\/(?:www\.)?github\.com\/([^/?#]+)(?:\/([^/?#]+))?/i.exec(url);
    if (!m) return null;
    url = `https://github.com/${m[1]}${m[2] ? `/${m[2].replace(/\.git$/, "")}` : ""}`;
  } else if (kind !== "website") {
    url = url.replace(/^http:\/\//i, "https://").replace("://www.", "://");
  }
  if (url.length > 300 || !PATTERN[kind].test(url)) return null;
  return { kind, column: LINK_COLUMN[kind], url };
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
