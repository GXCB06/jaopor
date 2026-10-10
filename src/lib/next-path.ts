// Where to send someone after sign-in (Design.md §6 Sign-in routing). Pure, so it is tested.
// First-user test 2026-10-05: everyone landed on an empty dashboard instead of the product.

/**
 * `next` is accepted only as an internal path: starts with one "/", no "//" or backslash (open
 * redirects), at most 500 chars, and never the login or onboarding pages themselves (loops).
 */
export function safeNextPath(raw: string | null | undefined): string | null {
  if (!raw || raw.length > 500) return null;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\"))
    return null;
  const path = raw.split(/[?#]/)[0];
  if (/^(\/[a-z]{2})?\/(login|onboarding)(\/|$)/.test(path)) return null;
  return raw;
}

/**
 * - No username yet → onboarding, which then continues to `next`.
 * - Otherwise `next` when given; else the dashboard for people with a startup, and the
 *   startups list (with the welcome banner) for everyone else.
 */
export function postLoginPath(input: {
  locale: string;
  next: string | null;
  hasHandle: boolean;
  hasStartups: boolean;
}): string {
  const next = safeNextPath(input.next);
  if (!input.hasHandle)
    return `/${input.locale}/onboarding${next ? `?next=${encodeURIComponent(next)}` : ""}`;
  return next ?? afterOnboardingPath(input.locale, input.hasStartups);
}

/** Default destination when there is no `next`. */
export function afterOnboardingPath(
  locale: string,
  hasStartups: boolean,
): string {
  return hasStartups ? `/${locale}/dashboard` : `/${locale}/startups?welcome=1`;
}

/**
 * Why someone is on the sign-in page, from `next`, so the title can say it (C-9, A1.1):
 * "add" = adding a project, "contact" = a contact request to a builder (`/u/{handle}?contact=1`).
 */
export function loginReason(next: string | null): "add" | "contact" | null {
  const safe = safeNextPath(next);
  if (!safe) return null;
  const [path, query = ""] = safe.split("#")[0].split("?");
  if (/^(?:\/(?:th|en))?\/new\/?$/.test(path)) return "add";
  if (
    /^(?:\/(?:th|en))?\/u\/[^/]+\/?$/.test(path) &&
    new URLSearchParams(query).get("contact") === "1"
  )
    return "contact";
  return null;
}
