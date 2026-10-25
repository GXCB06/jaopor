"use client";

import { PlayIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { FeedVideo } from "@/lib/media";
import { cn } from "@/lib/utils";

// Design.md §5 PostCard, video links (owner 2026-10-25): a YouTube / TikTok / Loom / Facebook link
// plays inside the post. Nothing from the provider loads until "เล่น" is pressed (privacy, and
// mobile data in Thailand); the link's preview image is the poster when we have one.

export function PostVideo({
  video,
  poster,
  title,
}: {
  video: FeedVideo;
  /** The link's Open Graph image (already fetched server-side), or null. */
  poster: string | null;
  title: string;
}) {
  const t = useTranslations("Posts");
  const [playing, setPlaying] = useState(false);
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border bg-black",
        video.vertical
          ? "mx-auto aspect-[9/16] max-h-[70vh] w-full max-w-xs"
          : "aspect-video w-full",
      )}
    >
      {playing ? (
        <iframe
          src={video.embedUrl}
          title={title}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          className="size-full"
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          aria-label={t("playVideo", { title })}
          className="group flex size-full items-center justify-center"
        >
          {poster && (
            // eslint-disable-next-line @next/next/no-img-element -- third-party OG image
            <img
              src={poster}
              alt=""
              loading="lazy"
              referrerPolicy="no-referrer"
              className="absolute inset-0 size-full object-cover opacity-80 transition-opacity group-hover:opacity-100"
            />
          )}
          <span className="relative flex size-14 items-center justify-center rounded-full bg-background/85 text-foreground transition-transform group-hover:scale-105">
            <PlayIcon className="size-6 translate-x-0.5" aria-hidden="true" />
          </span>
        </button>
      )}
    </div>
  );
}
