// Design.md §9: the image renderers (OG card, SVG badge, share cards) have no CSS variables,
// so they share this one palette mirroring the theme tokens in globals.css. Swatches are a
// fixed list: the share-card route accepts only these ids, never a caller-supplied colour.

export const CARD_THEME = {
  dark: {
    bg: "#09090b",
    card: "#141416",
    border: "#26262a",
    fg: "#fafafa",
    muted: "#a1a1aa",
    faint: "#7c7c87",
    grid: "#26262a",
    positive: "#34d399",
  },
  light: {
    bg: "#ffffff",
    card: "#fafafa",
    border: "#e4e4e7",
    fg: "#09090b",
    muted: "#52525b",
    faint: "#71717a",
    grid: "#e4e4e7",
    positive: "#047857",
  },
} as const;
export type CardTheme = keyof typeof CARD_THEME;

/** Brand mark tile colour (indigo, `--brand` / `--chart-1`). */
export const BRAND_HEX = "#6366f1";

export const SWATCHES = {
  indigo: "#6366f1",
  violet: "#8b5cf6",
  blue: "#3b82f6",
  sky: "#0ea5e9",
  cyan: "#06b6d4",
  teal: "#14b8a6",
  emerald: "#10b981",
  lime: "#84cc16",
  amber: "#f59e0b",
  orange: "#f97316",
  red: "#ef4444",
  pink: "#ec4899",
} as const;
export type SwatchId = keyof typeof SWATCHES;
export const SWATCH_IDS = Object.keys(SWATCHES) as SwatchId[];

export const isSwatch = (v: unknown): v is SwatchId =>
  typeof v === "string" && v in SWATCHES;

/** The fedora mark path (24×24 viewBox), shared by every renderer. */
export const MARK_PATH =
  "M5 15.5c2.2.9 4.5 1.3 7 1.3s4.8-.4 7-1.3M7.5 14.6l1.1-5.2c.2-.9 1-1.4 1.9-1.2l1.5.4 1.5-.4c.9-.2 1.7.3 1.9 1.2l1.1 5.2";
