// Server-safe half of the theme (no React imports), used by the root layout.
export const THEME_STORAGE_KEY = "theme";

/**
 * Runs before first paint. Dark is the CSS default; the choice is a `data-theme` attribute on <html>.
 * React must never own that attribute: the [locale] layout remounts on a language switch and would
 * rewrite it, which reset the user's theme.
 */
export const themeInitScript = `try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");document.documentElement.setAttribute("data-theme",t==="light"?"light":"dark")}catch(e){}`;
