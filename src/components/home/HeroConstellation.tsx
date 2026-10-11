"use client";

import { useEffect, useRef } from "react";

// Design.md §5 Hero — constellation background (owner-approved prototype 2026-10-12): real listed
// projects' logos and pills with verified sources / provinces / categories drift slowly behind
// the hero, joined by thin lines when close. Low alpha + a radial mask keep the headline, subline
// and search readable. Desktop animates (≤ ~30 fps, paused off-screen or in a hidden tab);
// phones and reduced motion get one still frame. Decorative: aria-hidden, no pointer events.

type Node = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  img?: HTMLImageElement;
  text?: string;
};

const LINK_DIST = 150;
const LOGO = 26;
const FRAME_MS = 33;

export function HeroConstellation({
  logos,
  words,
}: {
  logos: string[];
  words: string[];
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const animate = !reduce && window.matchMedia("(min-width: 768px)").matches;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const imgs = logos.slice(0, 14).map((src) => {
      const i = new Image();
      i.decoding = "async";
      i.src = src;
      return i;
    });
    const font = getComputedStyle(document.body).fontFamily;
    let w = 0;
    let h = 0;
    let nodes: Node[] = [];

    // Full window width (exactly the page's client width, so it can never cause sideways scroll),
    // lined up with the hero section it sits in.
    const fit = () => {
      const host = canvas.parentElement;
      if (!host) return;
      const vw = document.documentElement.clientWidth;
      canvas.style.width = `${vw}px`;
      canvas.style.left = `${-host.getBoundingClientRect().left}px`;
    };

    const seed = () => {
      fit();
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(30, Math.max(10, Math.round((w * h) / 20000)));
      const items: Omit<Node, "x" | "y" | "vx" | "vy">[] = [];
      for (let k = 0; items.length < count; k++) {
        if (imgs.length && k % 2 === 0)
          items.push({ img: imgs[k % imgs.length] });
        else if (words.length) items.push({ text: words[k % words.length] });
        else if (!imgs.length) break;
      }
      nodes = items.map((it) => ({
        ...it,
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
      }));
    };

    const draw = () => {
      const css = getComputedStyle(document.documentElement);
      const ink = css.getPropertyValue("--muted-foreground").trim() || "#888";
      const line = css.getPropertyValue("--border").trim() || "#444";
      const card = css.getPropertyValue("--card").trim() || "transparent";
      ctx.clearRect(0, 0, w, h);
      ctx.lineWidth = 1;
      for (let a = 0; a < nodes.length; a++)
        for (let b = a + 1; b < nodes.length; b++) {
          const d = Math.hypot(
            nodes[a].x - nodes[b].x,
            nodes[a].y - nodes[b].y,
          );
          if (d > LINK_DIST) continue;
          ctx.globalAlpha = 0.6 * (1 - d / LINK_DIST);
          ctx.strokeStyle = line;
          ctx.beginPath();
          ctx.moveTo(nodes[a].x, nodes[a].y);
          ctx.lineTo(nodes[b].x, nodes[b].y);
          ctx.stroke();
        }
      ctx.font = `12px ${font}`;
      ctx.textBaseline = "middle";
      for (const n of nodes) {
        if (n.img) {
          if (!n.img.complete || !n.img.naturalWidth) continue;
          ctx.save();
          ctx.globalAlpha = 0.7;
          ctx.beginPath();
          ctx.roundRect(n.x - LOGO / 2, n.y - LOGO / 2, LOGO, LOGO, 6);
          ctx.clip();
          ctx.drawImage(n.img, n.x - LOGO / 2, n.y - LOGO / 2, LOGO, LOGO);
          ctx.restore();
        } else if (n.text) {
          const tw = ctx.measureText(n.text).width;
          ctx.globalAlpha = 0.85;
          ctx.fillStyle = card;
          ctx.strokeStyle = line;
          ctx.beginPath();
          ctx.roundRect(n.x - tw / 2 - 8, n.y - 11, tw + 16, 22, 11);
          ctx.fill();
          ctx.stroke();
          ctx.globalAlpha = 0.9;
          ctx.fillStyle = ink;
          ctx.fillText(n.text, n.x - tw / 2, n.y + 0.5);
        }
      }
      ctx.globalAlpha = 1;
    };

    const step = () => {
      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < -20) n.x = w + 20;
        else if (n.x > w + 20) n.x = -20;
        if (n.y < -20) n.y = h + 20;
        else if (n.y > h + 20) n.y = -20;
      }
    };

    seed();
    draw();
    // Logos arrive after the first frame: draw again once they load.
    for (const i of imgs) i.addEventListener("load", draw, { once: true });

    let raf = 0;
    let last = 0;
    let onScreen = true;
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      if (t - last < FRAME_MS) return;
      last = t;
      step();
      draw();
    };
    const sync = () => {
      cancelAnimationFrame(raf);
      if (animate && onScreen && document.visibilityState === "visible")
        raf = requestAnimationFrame(loop);
    };
    const io = new IntersectionObserver(([e]) => {
      onScreen = e.isIntersecting;
      sync();
    });
    io.observe(canvas);
    document.addEventListener("visibilitychange", sync);
    // The hero's size or the window's width changed: re-seed for the new area.
    const reseed = () => {
      seed();
      draw();
    };
    const ro = new ResizeObserver(reseed);
    if (canvas.parentElement) ro.observe(canvas.parentElement);
    window.addEventListener("resize", reseed);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      window.removeEventListener("resize", reseed);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [logos, words]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      // Until the script sizes it: the hero's own box (a bare canvas would size itself 2:1 and spill).
      className="pointer-events-none absolute top-0 left-0 -z-10 h-full w-full max-w-none"
      style={{
        // The centre (headline, subline, search) stays clear.
        maskImage:
          "radial-gradient(ellipse 34% 50% at 50% 46%, transparent 60%, black 100%)",
        WebkitMaskImage:
          "radial-gradient(ellipse 34% 50% at 50% 46%, transparent 60%, black 100%)",
      }}
    />
  );
}
