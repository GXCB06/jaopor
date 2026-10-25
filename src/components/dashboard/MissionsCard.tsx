"use client";

import {
  CircleCheckIcon,
  MedalIcon,
  NewspaperIcon,
  RocketIcon,
  Share2Icon,
  ShieldCheckIcon,
  UserRoundIcon,
  UsersIcon,
  XIcon,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useSyncExternalStore, useState } from "react";
import { Card } from "@/components/core/Card";
import { Link } from "@/i18n/navigation";
import { MISSIONS, localMissionDone, type Mission } from "@/lib/missions";
import { cn } from "@/lib/utils";

// Design.md §6 Dashboard overview, Missions "ภารกิจเจ้าพ่อ" (owner 2026-10-25). Server missions arrive
// as props; the two browser missions (olympics, share) are read from localStorage after hydration.

const ICON: Record<Mission, LucideIcon> = {
  firstStartup: RocketIcon,
  verify: ShieldCheckIcon,
  profile: UserRoundIcon,
  firstPost: NewspaperIcon,
  follow3: UsersIcon,
  olympics: MedalIcon,
  share: Share2Icon,
};
const DISMISS_KEY = "jaopor.missions.dismissed";

const noop = () => () => {};
/** localStorage only after hydration (the server renders every browser mission as open). */
function useHydrated() {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}

export function MissionsCard({
  done: serverDone,
  href,
}: {
  done: Record<Exclude<Mission, "olympics" | "share">, boolean>;
  href: Record<Mission, string>;
}) {
  const t = useTranslations("Missions");
  const hydrated = useHydrated();
  const [dismissed, setDismissed] = useState(false);
  const done: Record<Mission, boolean> = {
    ...serverDone,
    olympics: hydrated && localMissionDone("olympics"),
    share: hydrated && localMissionDone("share"),
  };
  const doneCount = MISSIONS.filter((m) => done[m]).length;
  const next = MISSIONS.find((m) => !done[m]);
  const wasDismissed =
    hydrated &&
    (() => {
      try {
        return localStorage.getItem(DISMISS_KEY) === "1";
      } catch {
        return false;
      }
    })();

  if (doneCount === MISSIONS.length) {
    if (dismissed || wasDismissed) return null;
    return (
      <Card className="flex items-center justify-between gap-3 p-4">
        <p className="flex items-center gap-2 text-caption font-semibold text-positive">
          <CircleCheckIcon className="size-4" aria-hidden="true" />
          {t("allDone")}
        </p>
        <button
          type="button"
          aria-label={t("dismiss")}
          onClick={() => {
            setDismissed(true);
            try {
              localStorage.setItem(DISMISS_KEY, "1");
            } catch {
              // Blocked storage: it just shows again next time.
            }
          }}
          className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <XIcon className="size-4" aria-hidden="true" />
        </button>
      </Card>
    );
  }

  return (
    <Card id="missions" className="scroll-mt-20 p-5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <h2 className="text-sm font-bold">{t("title")}</h2>
        <span className="text-caption text-faint tabular-nums">
          {doneCount} / {MISSIONS.length}
        </span>
        <div
          className="h-1.5 min-w-24 flex-1 overflow-hidden rounded-full bg-secondary"
          role="progressbar"
          aria-valuenow={doneCount}
          aria-valuemin={0}
          aria-valuemax={MISSIONS.length}
          aria-label={t("title")}
        >
          <div
            className="h-full rounded-full bg-brand transition-[width] duration-(--motion-base)"
            style={{ width: `${(doneCount / MISSIONS.length) * 100}%` }}
          />
        </div>
        <span className="text-2xs text-faint">{t("hint")}</span>
      </div>
      <ol className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {MISSIONS.map((m) => {
          const Icon = done[m] ? CircleCheckIcon : ICON[m];
          const inner = (
            <>
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-xl",
                  done[m]
                    ? "bg-positive/10 text-positive"
                    : "bg-brand/10 text-brand-text",
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <span className="min-w-0 space-y-0.5">
                <span
                  className={cn(
                    "block text-caption font-semibold",
                    done[m] && "text-faint",
                  )}
                >
                  {t(`items.${m}.title`)}
                  {done[m] && <span className="sr-only"> ({t("done")})</span>}
                </span>
                <span className="block text-2xs text-muted-foreground">
                  {t(`items.${m}.why`)}
                </span>
              </span>
            </>
          );
          const cls = cn(
            "flex items-start gap-3 rounded-xl border p-3",
            m === next
              ? "border-brand bg-brand/5"
              : done[m]
                ? ""
                : "hover:bg-accent",
          );
          return (
            <li key={m}>
              {done[m] ? (
                <span className={cls}>{inner}</span>
              ) : (
                <Link href={href[m]} className={cls}>
                  {inner}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
