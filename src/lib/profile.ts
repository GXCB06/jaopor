// Phase 9 builder profiles: vocabularies and pure rules shared by the editor, onboarding, server
// actions and the dashboard checklist. The lists mirror the private.profiles_validate() trigger
// and the handle CHECK in migration builder_profiles (config.test.ts checks the drift).

export const PROFILE_STATUSES = [
  "looking_cofounder",
  "open_to_work",
  "networking",
  "busy",
] as const;
export type ProfileStatus = (typeof PROFILE_STATUSES)[number];

/** looking_for.roles: the skill groups someone is looking for. */
export const LOOKING_ROLES = [
  "engineering",
  "product",
  "design",
  "growth",
  "sales",
  "ops",
  "ai",
] as const;
export const COMMITMENTS = [
  "full_time",
  "part_time",
  "weekends",
  "flexible",
] as const;
export const DEALS = [
  "equity",
  "salary",
  "equity_salary",
  "revenue_share",
  "tbd",
] as const;
export const WORK_LOCATIONS = ["remote", "onsite", "hybrid"] as const;

export const SOCIAL_KEYS = [
  "linkedin",
  "github",
  "facebook",
  "youtube",
  "tiktok",
  "website",
] as const;
export type SocialKey = (typeof SOCIAL_KEYS)[number];

export const VISIBILITY_FIELDS = [
  "bio",
  "province",
  "social_links",
  "looking_for",
  "positions",
  "skills",
  "activity",
] as const;
export type VisibilityField = (typeof VISIBILITY_FIELDS)[number];
export const VISIBILITIES = ["public", "members", "hidden"] as const;
export type Visibility = (typeof VISIBILITIES)[number];

export const RESERVED_HANDLES = [
  "admin",
  "administrator",
  "api",
  "app",
  "auth",
  "builders",
  "categories",
  "category",
  "dashboard",
  "en",
  "help",
  "jaopor",
  "login",
  "logout",
  "me",
  "new",
  "null",
  "olympics",
  "privacy",
  "province",
  "root",
  "settings",
  "signin",
  "signup",
  "startup",
  "startups",
  "support",
  "system",
  "terms",
  "th",
  "u",
  "undefined",
  "www",
] as const;

export const HANDLE_RE = /^[a-z0-9_]{3,30}$/;

/** "invalid" | "reserved" | null (ok). Availability is a separate server check. */
export function handleProblem(raw: string): "invalid" | "reserved" | null {
  const h = raw.trim().toLowerCase();
  if (!HANDLE_RE.test(h)) return "invalid";
  if ((RESERVED_HANDLES as readonly string[]).includes(h)) return "reserved";
  return null;
}

/** Suggest a handle from a display name or email ("Chawankorn B." → "chawankorn_b"). */
export function suggestHandle(name: string | null | undefined): string {
  const base = (name ?? "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24);
  return base.length >= 3 && !handleProblem(base) ? base : "";
}

/** A social link as typed → https URL, or null when it isn't one we accept. */
export function normalizeSocial(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    url.protocol = "https:";
    const out = url.toString().replace(/\/$/, "");
    return /^https:\/\/[^\s]{4,200}$/.test(out) ? out : null;
  } catch {
    return null;
  }
}

export type LookingFor = {
  roles?: string[];
  offer?: string;
  commitment?: string;
  deal?: string;
  location?: string;
  industries?: string[];
};

/** Keep only well-formed keys/values (the DB trigger rejects anything else). */
export function cleanLookingFor(v: LookingFor): LookingFor {
  const out: LookingFor = {};
  const roles = (v.roles ?? []).filter((r) =>
    (LOOKING_ROLES as readonly string[]).includes(r),
  );
  if (roles.length) out.roles = [...new Set(roles)].slice(0, 7);
  const offer = v.offer?.trim().slice(0, 200);
  if (offer) out.offer = offer;
  if ((COMMITMENTS as readonly string[]).includes(v.commitment ?? ""))
    out.commitment = v.commitment;
  if ((DEALS as readonly string[]).includes(v.deal ?? "")) out.deal = v.deal;
  if ((WORK_LOCATIONS as readonly string[]).includes(v.location ?? ""))
    out.location = v.location;
  if (v.industries?.length)
    out.industries = [...new Set(v.industries)].slice(0, 5);
  return out;
}

/** Dashboard setup checklist (spec 9d): 6 items computed from data, in this order. */
export const SETUP_STEPS = [
  "account",
  "firstStartup",
  "province",
  "verify",
  "skillsStatus",
  "screenshots",
] as const;
export type SetupStep = (typeof SETUP_STEPS)[number];

export function setupChecklist(input: {
  startups: number;
  province: string | null;
  verifiedStartups: number;
  skills: number;
  screenshots: number;
}): Record<SetupStep, boolean> {
  return {
    account: true,
    firstStartup: input.startups > 0,
    province: Boolean(input.province),
    verify: input.verifiedStartups > 0,
    // "skills + status": status always has a value (chosen in onboarding), so skills decide.
    skillsStatus: input.skills > 0,
    screenshots: input.screenshots >= 3,
  };
}
