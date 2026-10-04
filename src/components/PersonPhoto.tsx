"use client";

import { useState } from "react";

/**
 * Design.md §5 Avatar: a person's photo, or `fallback` (their initials) when there is no photo or
 * it can't be shown: missing, not https, deleted from Storage (cached pages can still point at a
 * replaced photo for a minute) or any other load failure. Never a broken-image icon or an error.
 * The caller keeps its own frame (size, circle, border); this only decides what goes inside it.
 */
export function PersonPhoto({
  src,
  fallback,
  className = "size-full object-cover",
  loading,
}: {
  src: string | null | undefined;
  fallback: React.ReactNode;
  className?: string;
  loading?: "lazy";
}) {
  // Remember which URL failed, so a new photo is tried again.
  const [failed, setFailed] = useState<string | null>(null);
  if (!src?.startsWith("https://") || failed === src) return <>{fallback}</>;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- avatars: tiny, Storage / OAuth hosts
    <img
      src={src}
      alt=""
      loading={loading}
      className={className}
      onError={() => setFailed(src)}
      // A server-rendered image can fail before React attaches onError.
      ref={(img) => {
        if (img?.complete && img.naturalWidth === 0) setFailed(src);
      }}
    />
  );
}
