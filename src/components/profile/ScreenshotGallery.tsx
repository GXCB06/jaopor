"use client";

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlayIcon,
  XIcon,
} from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { screenshotUrl, videoEmbed, type Screenshot } from "@/lib/media";
import { cn } from "@/lib/utils";

const iconBtn =
  "inline-flex size-8 items-center justify-center rounded-md border bg-card text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40";

/**
 * Design.md §5 ScreenshotGallery (spec 6.4 step 4): App Store-style scroll-snap carousel
 * (desktop shots in a browser frame, phone/LINE shots in a phone frame), optional demo video as
 * the first slide, and a modal lightbox.
 */
export function ScreenshotGallery({
  name,
  domain,
  websiteUrl,
  shots,
  videoUrl,
}: {
  name: string;
  domain: string | null;
  websiteUrl: string | null;
  shots: Screenshot[];
  videoUrl: string | null;
}) {
  const t = useTranslations("Profile");
  const video = videoEmbed(videoUrl);
  const slideCount = shots.length + (video ? 1 : 0);
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [edges, setEdges] = useState({ left: false, right: false });
  const [playing, setPlaying] = useState(false);
  const [open, setOpen] = useState<number | null>(null);

  const alt = (s: Screenshot, i: number) =>
    s.caption || t("screenshotAlt", { name, n: i + 1 });

  const onScroll = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const slides = [...el.children] as HTMLElement[];
    const x = el.scrollLeft;
    let best = 0;
    slides.forEach((s, i) => {
      if (
        Math.abs(s.offsetLeft - el.offsetLeft - x) <
        Math.abs(slides[best].offsetLeft - el.offsetLeft - x)
      )
        best = i;
    });
    setIndex(best);
    setEdges({ left: x > 4, right: x + el.clientWidth < el.scrollWidth - 4 });
  }, []);

  useEffect(() => {
    onScroll();
    window.addEventListener("resize", onScroll);
    return () => window.removeEventListener("resize", onScroll);
  }, [onScroll]);

  const go = (i: number) => {
    const el = trackRef.current;
    const slide = el?.children[i] as HTMLElement | undefined;
    if (!el || !slide) return;
    el.scrollTo({ left: slide.offsetLeft - el.offsetLeft, behavior: "smooth" });
  };

  const single = !video && shots.length === 1 && shots[0].kind === "desktop";

  const desktopFrame = (s: Screenshot, i: number, full = false) => (
    <figure
      className={cn(
        "shrink-0 snap-start space-y-2",
        full ? "w-full" : "w-[88vw] sm:w-[720px]",
      )}
    >
      <button
        type="button"
        onClick={() => setOpen(i)}
        aria-label={t("openShot", { n: i + 1 })}
        className="block w-full overflow-hidden rounded-xl border bg-card text-left"
      >
        <span className="flex h-7 items-center gap-1.5 border-b px-3">
          {[0, 1, 2].map((d) => (
            <span
              key={d}
              className="size-2 rounded-full bg-muted-foreground/30"
            />
          ))}
          {domain && (
            <span className="ml-2 truncate text-2xs text-faint">{domain}</span>
          )}
        </span>
        <span className="block aspect-[16/10] bg-muted">
          <Image
            src={screenshotUrl(s.path)}
            alt={alt(s, i)}
            width={s.width}
            height={s.height}
            loading={i < 2 ? "eager" : "lazy"}
            className="size-full object-cover object-top"
          />
        </span>
      </button>
      {s.caption && (
        <figcaption className="text-caption text-muted-foreground">
          {s.caption}
        </figcaption>
      )}
    </figure>
  );

  const phoneFrame = (s: Screenshot, i: number) => (
    <figure className="w-[260px] shrink-0 snap-start space-y-2">
      <button
        type="button"
        onClick={() => setOpen(i)}
        aria-label={t("openShot", { n: i + 1 })}
        className="block aspect-[9/19.5] w-full overflow-hidden rounded-[28px] border-4 border-border bg-muted"
      >
        <Image
          src={screenshotUrl(s.path)}
          alt={alt(s, i)}
          width={s.width}
          height={s.height}
          loading={i < 2 ? "eager" : "lazy"}
          className="size-full object-cover object-top"
        />
      </button>
      {s.caption && (
        <figcaption className="text-caption text-muted-foreground">
          {s.caption}
        </figcaption>
      )}
    </figure>
  );

  return (
    <section aria-label={t("screenshots")} className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <h2 className="text-sm font-bold">{t("screenshots")}</h2>
          {domain && websiteUrl && (
            <a
              href={websiteUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="text-caption text-faint hover:text-foreground"
            >
              {domain}
            </a>
          )}
        </div>
        {!single && slideCount > 1 && (
          <div className="flex items-center gap-2">
            <span
              className="text-caption text-muted-foreground tabular-nums"
              aria-live="polite"
            >
              {index + 1} / {slideCount}
            </span>
            <button
              type="button"
              onClick={() => go(index - 1)}
              disabled={!edges.left}
              aria-label={t("prevShot")}
              className={cn(iconBtn, "hidden sm:inline-flex")}
            >
              <ChevronLeftIcon className="size-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              disabled={!edges.right}
              aria-label={t("nextShot")}
              className={cn(iconBtn, "hidden sm:inline-flex")}
            >
              <ChevronRightIcon className="size-4" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      {single ? (
        desktopFrame(shots[0], 0, true)
      ) : (
        <div
          ref={trackRef}
          onScroll={onScroll}
          tabIndex={0}
          aria-label={t("screenshots")}
          role="group"
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") {
              e.preventDefault();
              go(Math.min(slideCount - 1, index + 1));
            } else if (e.key === "ArrowLeft") {
              e.preventDefault();
              go(Math.max(0, index - 1));
            }
          }}
          className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-2 focus-visible:outline-2 focus-visible:outline-ring"
          style={{
            maskImage: `linear-gradient(to right, ${edges.left ? "transparent" : "#000"} 0, #000 32px, #000 calc(100% - 32px), ${edges.right ? "transparent" : "#000"} 100%)`,
          }}
        >
          {video && (
            <div className="w-[88vw] shrink-0 snap-start sm:w-[720px]">
              <div className="relative aspect-video overflow-hidden rounded-xl border bg-black">
                {playing ? (
                  <iframe
                    src={video.embedUrl}
                    title={t("demoVideo", { name })}
                    allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                    allowFullScreen
                    className="size-full"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setPlaying(true)}
                    className="flex size-full flex-col items-center justify-center gap-3 text-white"
                  >
                    <span className="flex size-14 items-center justify-center rounded-full bg-background/80 text-foreground">
                      <PlayIcon
                        className="size-6 translate-x-0.5"
                        aria-hidden="true"
                      />
                    </span>
                    <span className="text-caption">{t("playDemo")}</span>
                  </button>
                )}
              </div>
            </div>
          )}
          {shots.map((s, i) => (
            <Fragment key={s.id}>
              {s.kind === "desktop" ? desktopFrame(s, i) : phoneFrame(s, i)}
            </Fragment>
          ))}
        </div>
      )}

      <Lightbox
        shots={shots}
        index={open}
        onIndex={setOpen}
        alt={alt}
        labels={{
          close: t("closeShot"),
          prev: t("prevShot"),
          next: t("nextShot"),
        }}
      />
    </section>
  );
}

function Lightbox({
  shots,
  index,
  onIndex,
  alt,
  labels,
}: {
  shots: Screenshot[];
  index: number | null;
  onIndex: (i: number | null) => void;
  alt: (s: Screenshot, i: number) => string;
  labels: { close: string; prev: string; next: string };
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const startX = useRef<number | null>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (index !== null && !d.open) d.showModal();
    if (index === null && d.open) d.close();
  }, [index]);

  if (!shots.length) return null;
  const i = index ?? 0;
  const s = shots[i];
  const step = (n: number) => onIndex((i + n + shots.length) % shots.length);

  return (
    <dialog
      ref={ref}
      aria-label={alt(s, i)}
      onClose={() => onIndex(null)}
      onClick={(e) => e.target === e.currentTarget && onIndex(null)}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") step(1);
        if (e.key === "ArrowLeft") step(-1);
      }}
      onPointerDown={(e) => (startX.current = e.clientX)}
      onPointerUp={(e) => {
        if (startX.current === null) return;
        const dx = e.clientX - startX.current;
        startX.current = null;
        if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
      }}
      className="m-0 h-dvh max-h-none w-screen max-w-none bg-background/95 p-4 text-foreground backdrop:bg-black/60"
    >
      <div
        className="flex size-full flex-col items-center justify-center gap-3"
        onClick={(e) => e.target === e.currentTarget && onIndex(null)}
      >
        <button
          type="button"
          onClick={() => onIndex(null)}
          aria-label={labels.close}
          className={cn(iconBtn, "absolute top-4 right-4")}
        >
          <XIcon className="size-4" aria-hidden="true" />
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element -- full-size original in the lightbox */}
        <img
          src={screenshotUrl(s.path)}
          alt={alt(s, i)}
          className="max-h-[80vh] max-w-full rounded-lg border object-contain"
          draggable={false}
        />
        <div className="flex items-center gap-3 text-caption text-muted-foreground">
          {shots.length > 1 && (
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label={labels.prev}
              className={iconBtn}
            >
              <ChevronLeftIcon className="size-4" aria-hidden="true" />
            </button>
          )}
          <span className="tabular-nums">
            {i + 1} / {shots.length}
          </span>
          {shots.length > 1 && (
            <button
              type="button"
              onClick={() => step(1)}
              aria-label={labels.next}
              className={iconBtn}
            >
              <ChevronRightIcon className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>
        {s.caption && <p className="text-sm">{s.caption}</p>}
      </div>
    </dialog>
  );
}
