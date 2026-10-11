// Page enter (Design.md §7 Motion, owner request 2026-10-11): a page opened by a link or a reload
// fades its blocks up as it appears; one reached with Back / Forward appears at once (it was seen
// already). The flag lives on <html data-nav> and is set before the first paint, so the CSS plays
// from the first frame and nothing waits on JavaScript (no visible-then-hidden blink).

/** Inline <head> script: "back" when this document load came from Back / Forward, else "enter". */
export const navInitScript = `try{var n=performance.getEntriesByType("navigation")[0];document.documentElement.setAttribute("data-nav",n&&n.type==="back_forward"?"back":"enter")}catch(e){}`;
