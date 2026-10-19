"use client";

import {
  Loader2Icon,
  MessageSquareIcon,
  PencilIcon,
  ShieldIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  getModeratorView,
  moderateListing,
  sendBuyRequest,
  type ModeratorView,
} from "@/app/actions/listing";
import { ReportDialog } from "@/components/builder/ReportDialog";
import { useOwnerContext } from "@/components/profile/Owner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { inputClass } from "@/components/wizard/fields";
import { Link, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

// Design.md "For-sale listing": the parts of the banner that depend on who is looking. The
// project page is ISR-cached for everyone, so owner / signed-in / moderator are decided here, in
// the browser (UI hints only: the database and the server actions enforce every rule).

const action =
  "inline-flex h-9 w-full items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold sm:w-auto";

/** Owner → "แก้ไขประกาศ"; signed-out → sign in, back to this page; else the buy-request dialog. */
export function ForSaleActions({
  startupId,
  ownerId,
  slug,
  name,
}: {
  startupId: number;
  ownerId: string;
  slug: string;
  name: string;
}) {
  const t = useTranslations("ForSale");
  const locale = useLocale();
  const { isOwner, signedIn } = useOwnerContext();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, start] = useTransition();

  if (isOwner)
    return (
      <Link
        href={`/dashboard/${startupId}/edit#for-sale`}
        className={cn(action, "border bg-card hover:bg-accent")}
      >
        <PencilIcon className="size-4" aria-hidden="true" />
        {t("edit")}
      </Link>
    );

  const primary = cn(
    action,
    "bg-primary text-primary-foreground hover:bg-primary/90",
  );
  if (!signedIn)
    return (
      <Link
        href={{
          pathname: "/login",
          query: { next: `/${locale}/startup/${slug}` },
        }}
        className={primary}
      >
        <MessageSquareIcon className="size-4" aria-hidden="true" />
        {t("contact")}
      </Link>
    );

  const send = () =>
    start(async () => {
      const res = await sendBuyRequest(startupId, ownerId, message);
      if (res.ok) {
        toast.success(t("sent"));
        setOpen(false);
        setMessage("");
      } else
        toast.error(
          t(`errors.${res.error as "failed"}`),
        );
    });

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={primary}>
        <MessageSquareIcon className="size-4" aria-hidden="true" />
        {t("contact")}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("dialogTitle", { name })}</DialogTitle>
            <DialogDescription>{t("dialogHint")}</DialogDescription>
          </DialogHeader>
          <label className="block space-y-1.5">
            <span className="text-caption font-semibold">{t("message")}</span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={500}
              rows={4}
              placeholder={t("messagePh")}
              className={cn(inputClass, "h-auto py-2")}
            />
          </label>
          <p className="text-2xs text-faint">{t("rules")}</p>
          <DialogFooter>
            <Button
              type="button"
              onClick={send}
              disabled={busy || !message.trim()}
            >
              {busy && (
                <Loader2Icon className="animate-spin" aria-hidden="true" />
              )}
              {t("send")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** "รายงานประกาศนี้" for signed-in visitors (not the owner). */
export function ForSaleReport({ startupId }: { startupId: number }) {
  const { isOwner, signedIn } = useOwnerContext();
  if (isOwner || !signedIn) return null;
  return (
    <div className="pl-6">
      <ReportDialog targetType="listing" targetId={String(startupId)} />
    </div>
  );
}

const VIEWER_KEY = "jaopor.viewer";

/** One listing view per browser per day (hashed on the server, no IP; the owner is skipped). */
export function ListingViewBeacon({ startupId }: { startupId: number }) {
  useEffect(() => {
    let vid: string;
    try {
      vid = localStorage.getItem(VIEWER_KEY) ?? crypto.randomUUID();
      localStorage.setItem(VIEWER_KEY, vid);
    } catch {
      vid = crypto.randomUUID();
    }
    fetch("/api/listing-view", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ startupId, vid }),
      keepalive: true,
    }).catch(() => {});
  }, [startupId]);
  return null;
}

/**
 * Moderators only (MODERATOR_USER_IDS, checked by the server action): the listing's state and one
 * button to hide it (with a reason the owner will see) or show it again. Nothing for anyone else,
 * and nothing for a project that was never listed.
 */
export function ModeratorListingControl({ startupId }: { startupId: number }) {
  const t = useTranslations("ForSale.mod");
  const router = useRouter();
  const { signedIn } = useOwnerContext();
  const [view, setView] = useState<ModeratorView | null>(null);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, start] = useTransition();

  useEffect(() => {
    if (!signedIn) return;
    let live = true;
    getModeratorView(startupId)
      .then((v) => live && setView(v))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [signedIn, startupId]);

  if (!view?.moderator || !view.listing) return null;
  const { listing } = view;
  if (!listing.forSale && !listing.hidden) return null;

  const run = (hide: boolean) =>
    start(async () => {
      const res = await moderateListing(startupId, hide, reason);
      if (!res.ok) {
        toast.error(
          t(`errors.${res.error as "failed"}`),
        );
        return;
      }
      toast.success(hide ? t("hiddenDone") : t("restoredDone"));
      setOpen(false);
      setReason("");
      setView(await getModeratorView(startupId));
      router.refresh();
    });

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed p-3 text-caption">
      <p className="flex min-w-0 items-start gap-2 text-muted-foreground">
        <ShieldIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        <span className="min-w-0 break-words">
          {t("label")}: {listing.hidden ? t("hidden") : t("shown")}
          {listing.hidden && listing.hiddenReason
            ? ` — ${listing.hiddenReason}`
            : ""}
        </span>
      </p>
      {listing.hidden ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => run(false)}
        >
          {t("restore")}
        </Button>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setOpen(true)}
        >
          {t("hide")}
        </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("hide")}</DialogTitle>
          </DialogHeader>
          <label className="block space-y-1.5">
            <span className="text-caption font-semibold">{t("reason")}</span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              rows={3}
              className={cn(inputClass, "h-auto py-2")}
            />
          </label>
          <DialogFooter>
            <Button
              type="button"
              variant="destructive"
              disabled={busy || !reason.trim()}
              onClick={() => run(true)}
            >
              {busy && (
                <Loader2Icon className="animate-spin" aria-hidden="true" />
              )}
              {t("confirmHide")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
