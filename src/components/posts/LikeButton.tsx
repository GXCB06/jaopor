"use client";

import { HeartIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { setLike } from "@/app/actions/posts";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/** ♥ with an optimistic count; signed-out visitors get a link to sign in. */
export function LikeButton({
  postId,
  initialLiked,
  initialCount,
  signedIn,
  loginHref,
  disabled = false,
}: {
  postId: number;
  initialLiked: boolean;
  initialCount: number;
  signedIn: boolean;
  loginHref: string;
  disabled?: boolean;
}) {
  const t = useTranslations("Posts");
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [, start] = useTransition();
  const cls =
    "inline-flex h-8 items-center gap-1.5 rounded-md px-2 tabular-nums transition-colors hover:bg-accent hover:text-foreground";
  const icon = (
    <HeartIcon
      className={cn("size-4", liked && "fill-negative text-negative")}
      aria-hidden="true"
    />
  );
  if (!signedIn)
    return (
      <Link
        href={loginHref}
        className={cls}
        aria-label={t("likeCount", { n: count })}
      >
        {icon}
        {count}
      </Link>
    );
  return (
    <button
      type="button"
      aria-pressed={liked}
      aria-label={t("likeCount", { n: count })}
      disabled={disabled}
      onClick={() => {
        const next = !liked;
        setLiked(next);
        setCount((c) => c + (next ? 1 : -1));
        start(async () => {
          const res = await setLike(postId, next);
          if (!res.ok) {
            setLiked(!next);
            setCount((c) => c + (next ? -1 : 1));
            toast.error(t(`errors.${res.error}` as "errors.failed"));
          }
        });
      }}
      className={cn(cls, "disabled:opacity-50")}
    >
      {icon}
      {count}
    </button>
  );
}
