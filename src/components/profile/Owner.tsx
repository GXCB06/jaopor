"use client";

import { PencilIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { createContext, useContext, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";

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

/** Empty field: "+ Add" (deep link to the editor) for the owner, "Not added" for visitors. */
export function EmptyValue({
  field,
  visitorText,
}: {
  field: string;
  visitorText?: string;
}) {
  const { isOwner, startupId } = useContext(Ctx);
  const t = useTranslations("Profile");
  if (isOwner) {
    // "revenue" / "verify-*" open the VerifyPanel group; everything else the field itself.
    const anchor = field === "revenue" ? "verify-revenue" : field;
    const verify = anchor.startsWith("verify");
    return (
      <Link
        href={`/dashboard/${startupId}/edit#${anchor}`}
        className="inline-flex rounded-md border border-dashed border-brand/50 px-2 py-0.5 text-caption text-brand hover:bg-brand/10"
      >
        {verify ? t("connect") : t("add")}
      </Link>
    );
  }
  return (
    <p className="text-caption text-faint">{visitorText ?? t("notAdded")}</p>
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
