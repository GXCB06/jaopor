// Server-safe half of the theme (no React imports), used by the root layout.
export const THEME_STORAGE_KEY = "theme";

/** Runs before first paint. The server always renders `dark`; switch to light if stored. */
export const themeInitScript = `try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");var d=document.documentElement;if(t==="light"){d.classList.remove("dark")}else{d.classList.add("dark")}}catch(e){}`;
