// Design.md §9: the image renderers (OG card, SVG badge, share cards) have no CSS variables,
// so they share this one palette mirroring the theme tokens in globals.css. Swatches are a
// fixed list: the share-card route accepts only these ids, never a caller-supplied colour.

export const CARD_THEME = {
  dark: {
    bg: "#0a0a0b",
    card: "#141416",
    border: "#26262a",
    fg: "#ededed",
    muted: "#a1a1a6",
    faint: "#8a8a8f",
    grid: "#26262a",
    positive: "#22c55e",
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
export const BRAND_HEX = "#6e6cf3";

// Spec 6.5 order: blue, purple, indigo, sky, cyan, teal, emerald, lime, amber, orange, rose, pink.
export const SWATCHES = {
  blue: "#3b82f6",
  purple: "#a855f7",
  indigo: "#6e6cf3",
  sky: "#0ea5e9",
  cyan: "#06b6d4",
  teal: "#14b8a6",
  emerald: "#10b981",
  lime: "#84cc16",
  amber: "#f59e0b",
  orange: "#f97316",
  rose: "#f43f5e",
  pink: "#ec4899",
} as const;
export type SwatchId = keyof typeof SWATCHES;
export const SWATCH_IDS = Object.keys(SWATCHES) as SwatchId[];

export const isSwatch = (v: unknown): v is SwatchId =>
  typeof v === "string" && v in SWATCHES;

/** Region colours for image renderers (dark values of `--region-*`, Design.md §2). */
export const REGION_HEX = {
  north: "#3987e5",
  northeast: "#d95926",
  central: "#199e70",
  east: "#9085e9",
  west: "#c98500",
  south: "#d55181",
} as const;
