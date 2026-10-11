// Every dropdown in JaoPor opens BELOW its trigger and stays inside the screen (owner rule
// 2026-10-11, Design.md §5 Dropdowns). Before a list opens we scroll the page just enough to
// give it room underneath, then cap its height to the space that is really there, so the
// popper never has a reason to flip it upward.

/** Gap between trigger and list (sideOffset) plus the margin kept from the screen edge. */
const GAP = 12;
/** Keep the trigger below the sticky site header (h-14) when scrolling it up. */
const TOP_SAFE = 72;
/** Never offer less than this; below it the popper may still flip as a last resort. */
export const MIN_LIST_HEIGHT = 120;

/**
 * How far to scroll so `wanted` pixels fit under the trigger: never more than the deficit,
 * never so far that the trigger slides under the header. Pure, for tests.
 */
export function scrollNeeded(
  space: number,
  wanted: number,
  triggerTop: number,
  topSafe = TOP_SAFE,
): number {
  if (space >= wanted) return 0;
  return Math.max(0, Math.min(wanted - space, triggerTop - topSafe));
}

function viewportHeight(): number {
  return window.visualViewport?.height ?? window.innerHeight;
}

/** The element that scrolls the trigger: the nearest scrolling ancestor, else the page. */
function scrollerOf(el: HTMLElement): Element {
  for (
    let p = el.parentElement;
    p && p !== document.body;
    p = p.parentElement
  ) {
    const { overflowY } = getComputedStyle(p);
    if (
      (overflowY === "auto" || overflowY === "scroll") &&
      p.scrollHeight > p.clientHeight
    )
      return p;
  }
  return document.scrollingElement ?? document.documentElement;
}

/** Space under the trigger, in px, inside the visible screen. */
export function spaceBelow(trigger: HTMLElement): number {
  return viewportHeight() - trigger.getBoundingClientRect().bottom - GAP;
}

/**
 * Scrolls (instantly) so up to `wanted` px fit below the trigger, and returns the max height
 * the list may use. Call it right before opening.
 */
export function makeRoomBelow(trigger: HTMLElement, wanted: number): number {
  const rect = trigger.getBoundingClientRect();
  const need = scrollNeeded(
    viewportHeight() - rect.bottom - GAP,
    Math.min(wanted, viewportHeight() * 0.6),
    rect.top,
  );
  if (need > 0)
    scrollerOf(trigger).scrollBy({ top: need, behavior: "instant" });
  return Math.max(MIN_LIST_HEIGHT, Math.floor(spaceBelow(trigger)));
}

/** Rough list height for `rows` options (+ group headings), used as `wanted` (Thai rows ≈ 44 px). */
export function listHeight(rows: number, headings = 0, extra = 0): number {
  return Math.min(352, rows * 44 + headings * 30 + 12 + extra);
}

/**
 * Which edge of the trigger the list lines up with: the list may be wider than its trigger, so a
 * trigger in the right half of the screen gets a list aligned to its right edge (never off-screen).
 * Lists never flip or shift on their own (avoidCollisions off): this and the height cap keep them in.
 */
export function alignFor(trigger: HTMLElement): "start" | "end" {
  const r = trigger.getBoundingClientRect();
  return r.left + r.width / 2 > window.innerWidth / 2 ? "end" : "start";
}
