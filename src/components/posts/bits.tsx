import { ExternalLinkIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { LinkPreview } from "@/lib/og-parse";
import { postImageUrl, type PostType } from "@/lib/posts";
import { cn } from "@/lib/utils";

// Design.md §5 PostCard parts that need no client code.

const TYPE_TONE: Record<PostType, string> = {
  feature: "bg-brand/15 text-brand-text",
  launch: "bg-positive/10 text-positive",
  lesson: "bg-secondary text-muted-foreground",
  feedback: "bg-info/10 text-info",
  milestone: "bg-warning/10 text-warning",
};

export function PostTypeChip({ type }: { type: PostType }) {
  const t = useTranslations("Posts");
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2 py-0.5 text-2xs font-bold",
        TYPE_TONE[type],
      )}
    >
      {t(`types.${type}`)}
    </span>
  );
}

export function Avatar({
  name,
  src,
  size = 36,
  className,
}: {
  name: string;
  src: string | null;
  size?: number;
  className?: string;
}) {
  return (
    <span
      style={{ width: size, height: size }}
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full border bg-secondary text-2xs font-bold text-muted-foreground uppercase",
        className,
      )}
    >
      {src?.startsWith("https://") ? (
        // eslint-disable-next-line @next/next/no-img-element -- OAuth avatar
        <img
          src={src}
          alt=""
          className="size-full object-cover"
          loading="lazy"
        />
      ) : (
        name.slice(0, 2)
      )}
    </span>
  );
}

/** 1 image full width, 2–4 in a 2-column grid of square crops; each opens the full file. */
export function PostImages({
  images,
}: {
  images: { id: number; path: string; width: number; height: number }[];
}) {
  const t = useTranslations("Posts");
  if (!images.length) return null;
  if (images.length === 1) {
    const img = images[0];
    return (
      <a
        href={postImageUrl(img.path)}
        target="_blank"
        rel="noopener"
        className="block overflow-hidden rounded-lg border bg-secondary"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- Supabase Storage, already WebP */}
        <img
          src={postImageUrl(img.path)}
          alt={t("imageAlt", { n: 1 })}
          width={img.width}
          height={img.height}
          loading="lazy"
          className="max-h-[420px] w-full object-contain"
        />
      </a>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {images.map((img, i) => (
        <a
          key={img.id}
          href={postImageUrl(img.path)}
          target="_blank"
          rel="noopener"
          className="block aspect-square overflow-hidden rounded-lg border bg-secondary"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- Supabase Storage, already WebP */}
          <img
            src={postImageUrl(img.path)}
            alt={t("imageAlt", { n: i + 1 })}
            loading="lazy"
            className="size-full object-cover"
          />
        </a>
      ))}
    </div>
  );
}

/** Open Graph card when the server could read the page; the bare domain otherwise. */
export function LinkCard({
  url,
  preview,
}: {
  url: string;
  preview: LinkPreview | null;
}) {
  let domain = url;
  try {
    domain = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    // keep the raw text
  }
  if (!preview)
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener nofollow ugc"
        className="inline-flex max-w-full items-center gap-1 truncate text-caption text-brand-text hover:underline"
      >
        <ExternalLinkIcon className="size-3.5 shrink-0" aria-hidden="true" />
        <span className="truncate">{domain}</span>
      </a>
    );
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener nofollow ugc"
      className="block overflow-hidden rounded-lg border transition-colors hover:border-foreground/20"
    >
      {preview.image && (
        // eslint-disable-next-line @next/next/no-img-element -- third-party OG image
        <img
          src={preview.image}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          className="aspect-[1.91/1] w-full border-b object-cover"
        />
      )}
      <span className="block space-y-1 p-3">
        {preview.title && (
          <span className="line-clamp-2 block text-xs font-semibold">
            {preview.title}
          </span>
        )}
        {preview.description && (
          <span className="line-clamp-2 block text-caption text-muted-foreground">
            {preview.description}
          </span>
        )}
        <span className="block text-2xs text-faint">{preview.domain}</span>
      </span>
    </a>
  );
}
