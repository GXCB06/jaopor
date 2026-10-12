"use client";

import { useEffect, useRef } from "react";

// Design.md §7 Motion, card hover (owner 2026-10-12, after the Lovable mockup): while a mouse is
// over a card, a ring of brand colour follows the pointer around the card's border, with a faint
// wash inside. Put it as a child of a `relative` card. Mouse / trackpad only (no hover on touch);
// purely decorative, so it never takes clicks and is hidden from screen readers. The card needs
// `isolate` too, so the wash sits behind its text but above its background.

const RING =
  "radial-gradient(14rem circle at var(--gx, 50%) var(--gy, 50%), var(--brand), transparent 72%)";
const WASH =
  "radial-gradient(18rem circle at var(--gx, 50%) var(--gy, 50%), color-mix(in oklab, var(--brand) 10%, transparent), transparent 70%)";

export function CardGlow() {
  const ring = useRef<HTMLSpanElement>(null);
  const wash = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const card = ring.current?.parentElement;
    if (
      !card ||
      !window.matchMedia("(hover: hover) and (pointer: fine)").matches
    )
      return;
    const layers = [ring.current, wash.current].filter(
      (l): l is HTMLSpanElement => l !== null,
    );
    const move = (e: PointerEvent) => {
      const r = card.getBoundingClientRect();
      for (const l of layers) {
        l.style.setProperty("--gx", `${e.clientX - r.left}px`);
        l.style.setProperty("--gy", `${e.clientY - r.top}px`);
      }
    };
    const enter = (e: PointerEvent) => {
      move(e);
      for (const l of layers) l.dataset.on = "";
    };
    const leave = () => {
      for (const l of layers) delete l.dataset.on;
    };
    card.addEventListener("pointerenter", enter);
    card.addEventListener("pointermove", move);
    card.addEventListener("pointerleave", leave);
    return () => {
      card.removeEventListener("pointerenter", enter);
      card.removeEventListener("pointermove", move);
      card.removeEventListener("pointerleave", leave);
    };
  }, []);

  const layer =
    "pointer-events-none absolute rounded-[inherit] opacity-0 transition-opacity duration-(--motion-base) data-on:opacity-100";
  return (
    <>
      <span
        ref={wash}
        aria-hidden="true"
        className={`${layer} inset-0 -z-10`}
        style={{ background: WASH }}
      />
      {/* The ring: the gradient shows only in a 1.5 px band over the border (mask: whole box minus content box). */}
      <span
        ref={ring}
        aria-hidden="true"
        className={`${layer} -inset-[1.5px] p-[1.5px]`}
        style={{
          background: RING,
          mask: "linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0)",
          WebkitMask:
            "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
          WebkitMaskComposite: "xor",
        }}
      />
    </>
  );
}
