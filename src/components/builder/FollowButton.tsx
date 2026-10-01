"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { setFollow } from "@/app/actions/social";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/** Compact ติดตาม / กำลังติดตาม toggle (feed right rail); signed out → sign-in link. */
export function FollowButton({
  targetId,
  handle,
  signedIn,
  initial = false,
}: {
  targetId: string;
  handle: string;
  signedIn: boolean;
  initial?: boolean;
}) {
  const t = useTranslations("Builder");
  const [following, setFollowing] = useState(initial);
  const [busy, start] = useTransition();
  const cls =
    "inline-flex h-8 shrink-0 items-center rounded-md border px-3 text-caption font-semibold transition-colors hover:bg-accent";
  if (!signedIn)
    return (
      <Link href={`/login?next=/u/${handle}`} className={cls}>
        {t("follow")}
      </Link>
    );
  return (
    <button
      type="button"
      aria-pressed={following}
      disabled={busy}
      onClick={() =>
        start(async () => {
          const next = !following;
          setFollowing(next);
          const res = await setFollow(targetId, next, handle);
          if (!res.ok) {
            setFollowing(!next);
            toast.error(t(`errors.${res.error}` as "errors.failed"));
          }
        })
      }
      className={cn(
        cls,
        following && "bg-secondary text-muted-foreground",
        "disabled:opacity-60",
      )}
    >
      {following ? t("followingBtn") : t("follow")}
    </button>
  );
}
