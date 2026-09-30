"use client";

import { PencilIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { createContext, useContext, useEffect, useState } from "react";
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

/** Shown only to the owner, at the top of their own profile. */
export function OwnerBar() {
  const { isOwner, startupId } = useContext(Ctx);
  const t = useTranslations("Profile");
  if (!isOwner) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand/40 bg-brand/5 px-4 py-3">
      <p className="text-xs">{t("ownerBar")}</p>
      <Button asChild size="sm">
        <Link href={`/dashboard/${startupId}/edit`}>
          <PencilIcon />
          {t("editProfile")}
        </Link>
      </Button>
    </div>
  );
}
