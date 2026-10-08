"use client";

import { CheckCircle2Icon, PencilIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

// Design.md §5 InfoCard: the profile page is ISR-cached for everyone, so "is the viewer the
// owner?" is decided in the browser from the session. UI hint only — writes are protected by RLS.

type OwnerCtx = { isOwner: boolean; startupId: number };
const Ctx = createContext<OwnerCtx>({ isOwner: false, startupId: 0 });

export function OwnerProvider({
  ownerId,
  startupId,
  children,
}: {
  ownerId: string;
  startupId: number;
  children: React.ReactNode;
}) {
  const [isOwner, setIsOwner] = useState(false);
  useEffect(() => {
    createClient()
      .auth.getSession()
      .then(({ data }) => setIsOwner(data.session?.user.id === ownerId));
  }, [ownerId]);
  return <Ctx.Provider value={{ isOwner, startupId }}>{children}</Ctx.Provider>;
}

/** Renders its children for the owner only (empty-state rule, spec 2.4: visitors see nothing). */
export function OwnerOnly({ children }: { children: React.ReactNode }) {
  const { isOwner } = useContext(Ctx);
  return isOwner ? <>{children}</> : null;
}

/** Deep link into the editor: "revenue" / "verify-*" open the VerifyPanel group. */
function useEditHref(field: string) {
  const { startupId } = useContext(Ctx);
  const anchor = field === "revenue" ? "verify-revenue" : field;
  return {
    href: `/dashboard/${startupId}/edit#${anchor}`,
    verify: anchor.startsWith("verify"),
  };
}

/**
 * Spec 2.2 EmptyOwnerCard: dashed "+ เพิ่ม…" prompt linking to the edit form. Shown **only to the
 * owner**; visitors get nothing (no "–" walls). Owner detection is client-side to keep ISR.
 */
export function EmptyOwnerCard({
  field,
  label,
  className,
}: {
  field: string;
  label: string;
  className?: string;
}) {
  const { isOwner } = useContext(Ctx);
  const t = useTranslations("Profile");
  const { href, verify } = useEditHref(field);
  if (!isOwner) return null;
  return (
    <Link
      href={href}
      className={cn(
        "flex min-h-14 items-center justify-center rounded-xl border border-dashed border-brand/50 px-4 py-3 text-center text-caption text-brand-text transition-colors hover:bg-brand/10",
        className,
      )}
    >
      {verify ? t("connectNamed", { label }) : t("addNamed", { label })}
    </Link>
  );
}

/**
 * Spec 2.4: unverified metrics collapse into one muted line, not one card each. The owner also
 * gets the shortcut into the VerifyPanel.
 */
export function UnverifiedLine({ items }: { items: string[] }) {
  const { isOwner } = useContext(Ctx);
  const t = useTranslations("Profile");
  const { href } = useEditHref("revenue");
  if (!items.length) return null;
  return (
    <p className="text-center text-caption text-faint">
      {t("unverifiedLine", { items: items.join(", ") })}
      {isOwner && (
        <>
          {" · "}
          <Link href={href} className="text-brand-text hover:underline">
            {t("connectStripe")}
          </Link>
        </>
      )}
    </p>
  );
}

const STEPS = [
  { id: "story", anchor: "description" },
  { id: "shots", anchor: "screenshots" },
  { id: "proof", anchor: "verify" },
] as const;
type StepId = (typeof STEPS)[number]["id"];

const noop = () => () => {};

/**
 * Owner-only bar above the profile (Design.md §5 OwnerBar "3 ขั้นต่อไป", UX audit S-1). Until the
 * page has a story, a screenshot and a verified (or counted) number, it is an ordered checklist
 * whose items deep-link into the editor; the first open item is highlighted. Right after
 * Add-project (`?new=1`) it opens with "your project is on JaoPor". All done → the plain bar.
 */
export function OwnerBar({ done }: { done: Record<StepId, boolean> }) {
  const { isOwner, startupId } = useContext(Ctx);
  const t = useTranslations("Profile");
  // Read the query in the browser so the page stays ISR-cached (as ShareStudio does).
  const search = useSyncExternalStore(
    noop,
    () => window.location.search,
    () => "",
  );
  if (!isOwner) return null;
  const edit = `/dashboard/${startupId}/edit`;
  const left = STEPS.filter((s) => !done[s.id]).length;
  const next = STEPS.find((s) => !done[s.id])?.id;
  const editButton = (
    <Button asChild size="sm" variant={left ? "outline" : "default"}>
      <Link href={edit}>
        <PencilIcon />
        {t("editProfile")}
      </Link>
    </Button>
  );

  if (!left)
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand/40 bg-brand/5 px-4 py-3">
        <p className="min-w-0 flex-1 text-xs">{t("ownerBar")}</p>
        {editButton}
      </div>
    );

  return (
    <section
      aria-labelledby="owner-steps"
      className="space-y-3 rounded-xl border border-brand/40 bg-brand/5 p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-0.5">
          {new URLSearchParams(search).has("new") && (
            <p className="text-sm font-bold">{t("steps.listed")}</p>
          )}
          <h2 id="owner-steps" className="text-xs font-semibold">
            {t("steps.title", { n: left })}
          </h2>
        </div>
        {editButton}
      </div>
      <ol className="grid gap-2 sm:grid-cols-3">
        {STEPS.map((s, i) => {
          const isDone = done[s.id];
          return (
            <li key={s.id}>
              <Link
                href={`${edit}#${s.anchor}`}
                aria-current={s.id === next ? "step" : undefined}
                className={cn(
                  "flex h-full items-start gap-2.5 rounded-lg border px-3 py-2.5 transition-colors",
                  isDone
                    ? "border-transparent text-faint"
                    : s.id === next
                      ? "border-brand bg-brand/10 hover:bg-brand/15"
                      : "bg-card hover:bg-accent",
                )}
              >
                {isDone ? (
                  <CheckCircle2Icon
                    className="mt-0.5 size-4 shrink-0 text-positive"
                    aria-label={t("steps.done")}
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border text-3xs font-bold"
                  >
                    {i + 1}
                  </span>
                )}
                <span className="min-w-0 space-y-0.5">
                  <span
                    className={cn(
                      "block text-xs font-semibold",
                      isDone && "line-through",
                    )}
                  >
                    {t(`steps.${s.id}`)}
                  </span>
                  {!isDone && (
                    <span className="block text-caption text-muted-foreground">
                      {t(`steps.${s.id}Hint`)}
                    </span>
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
