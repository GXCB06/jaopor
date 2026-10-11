// Anonymous projects (Design.md §5 Anonymous projects; migration 20261011126000_anonymous_mode).
// While a project is anonymous its public row only holds placeholders: name "Anonymous", slug
// "anon-<10 hex>", no logo or links. The real identity is readable by its owner only
// (public.startup_identity). The slug shape is reserved for anonymous projects, so the UI can
// recognise one from any row, embed or search result without an extra column.

export const ANON_NAME = "Anonymous";
const ANON_SLUG = /^anon-[0-9a-f]{10}$/;

export function isAnonymousSlug(slug: string | null | undefined): boolean {
  return !!slug && ANON_SLUG.test(slug);
}

/** What an anonymous project hides from visitors (the owner still sees and edits all of it). */
export const ANONYMOUS_HIDES = [
  "name",
  "logo",
  "links",
  "screenshots",
  "demoVideo",
  "oldUrls",
] as const;
