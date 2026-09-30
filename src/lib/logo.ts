// "Rising Fedora" (spec §3): a white fedora on an indigo rounded-square tile; the hat band is a
// rising revenue line. One source of truth for the React <Logo>, the OG/share/badge renderers and
// the generated icon files (public/logo*.svg, src/app/icon.svg).

/** Tile colour (= `--brand` in dark; the logo keeps it in both themes). */
export const LOGO_TILE = "#6e6cf3";

/** Full mark (≥ 24px), 64×64 viewBox. */
export const LOGO_HAT =
  "M19 40 L21.5 24 C22 21 24.5 19.8 27 21 L32 23.5 L37 21 C39.5 19.8 42 21 42.5 24 L45 40 Z";
export const LOGO_LINE = "21.6,36 27,32 31,34.2 37,27.6 43.4,24.6";
export const LOGO_BRIM =
  "M5 43 C5 40.5 9 39.5 14 39.5 L50 39.5 C55 39.5 59 40.5 59 43 C59 45.5 55 46.5 50 46.5 L14 46.5 C9 46.5 5 45.5 5 43 Z";

/** Small mark (≤ 24px, favicon): the line is dropped and the hat is thicker. */
export const LOGO_SMALL_HAT = "M18 42 L21 22 L32 25 L43 22 L46 42 Z";

/** Inner SVG markup (64×64) for string renderers such as the badge route. */
export function logoMarkInner({
  tile = LOGO_TILE,
  hat = "#ffffff",
  small = false,
}: { tile?: string; hat?: string; small?: boolean } = {}): string {
  return small
    ? `<rect width="64" height="64" rx="14" fill="${tile}"/><path d="${LOGO_SMALL_HAT}" fill="${hat}"/><rect x="3" y="39" width="58" height="10" rx="5" fill="${hat}"/>`
    : `<rect width="64" height="64" rx="15" fill="${tile}"/><path d="${LOGO_HAT}" fill="${hat}"/><polyline points="${LOGO_LINE}" fill="none" stroke="${tile}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/><path d="${LOGO_BRIM}" fill="${hat}"/>`;
}
