// Phase 9b short profile links: /@handle and /{locale}/@handle → /{locale}/u/{handle}.
// (A folder named "@handle" would be a parallel route in the App Router, so the proxy rewrites.)

const AT = /^\/(?:(th|en)\/)?@([A-Za-z0-9_]{3,30})\/?$/;

/** The rewrite target for an @-path, or null when the path isn't one. */
export function atPathTarget(
  pathname: string,
  defaultLocale: string,
): string | null {
  const m = AT.exec(pathname);
  if (!m) return null;
  return `/${m[1] ?? defaultLocale}/u/${m[2].toLowerCase()}`;
}
