"use client";

import {
  Loader2Icon,
  MessageSquareIcon,
  PencilIcon,
  UserCheckIcon,
  UserPlusIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { sendRequest, setFollow } from "@/app/actions/social";
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
import { REQUEST_TOPICS, type RequestTopic } from "@/lib/looking-for";
import { cn } from "@/lib/utils";

/**
 * Design.md §5 Builder profile actions: "ติดต่อ" (contact request dialog; "ส่งข้อความ" into the chat once
 * a request is accepted) + "ติดตาม". Signed-out
 * visitors are sent to sign-in; the owner sees "แก้ไขโปรไฟล์" instead.
 */
export function ProfileActions({
  profileId,
  handle,
  name,
  signedIn,
  isOwner,
  following,
  requestStatus,
  openRequest = false,
  initialTopic = "cofounder",
}: {
  profileId: string;
  handle: string;
  name: string;
  signedIn: boolean;
  isOwner: boolean;
  following: boolean;
  /** Latest request between us, if any: pending / accepted / declined / blocked. */
  requestStatus: string | null;
  /** Arrived from a contact link (`?contact=1`, e.g. a project's "กำลังหา" box). */
  openRequest?: boolean;
  /** Preselected topic from that link (`&topic=`). */
  initialTopic?: RequestTopic;
}) {
  const t = useTranslations("Builder");
  const locale = useLocale();
  const router = useRouter();
  // A pending, accepted or blocked request can't take a new one: show its state instead of a
  // form that would only fail (A1.1).
  const contactDisabled =
    requestStatus === "pending" || requestStatus === "blocked";
  const canRequest = !contactDisabled && requestStatus !== "accepted";
  const [open, setOpen] = useState(openRequest && signedIn && canRequest);
  const [topic, setTopic] = useState<RequestTopic>(initialTopic);
  const [message, setMessage] = useState("");
  const [busy, start] = useTransition();
  const login = {
    pathname: "/login",
    query: { next: `/${locale}/u/${handle}` },
  } as const;

  if (isOwner)
    return (
      <Link
        href="/dashboard/profile"
        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border text-sm font-semibold hover:bg-accent"
      >
        <PencilIcon className="size-4" aria-hidden="true" />
        {t("editProfile")}
      </Link>
    );

  const follow = () =>
    start(async () => {
      const res = await setFollow(profileId, !following, handle);
      if (res.ok) router.refresh();
      else toast.error(t(`errors.${res.error}`));
    });
  const send = () =>
    start(async () => {
      const res = await sendRequest(profileId, topic, message, handle);
      if (res.ok) {
        toast.success(t("requestSent"));
        setOpen(false);
        setMessage("");
        router.refresh();
      } else toast.error(t(`errors.${res.error}`));
    });

  const arrival =
    openRequest && signedIn && !canRequest && requestStatus
      ? t(`arrival.${requestStatus as "pending" | "accepted" | "blocked"}`, {
          name,
        })
      : null;
  return (
    <div className="grid grid-cols-2 gap-2">
      {arrival && (
        <p
          role="status"
          className="col-span-2 rounded-md border bg-secondary px-3 py-2 text-caption text-muted-foreground"
        >
          {arrival}
        </p>
      )}
      {signedIn && requestStatus === "accepted" ? (
        <Link
          href={`/dashboard/messages?with=${profileId}`}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          <MessageSquareIcon className="size-4" aria-hidden="true" />
          {t("sendMessage")}
        </Link>
      ) : signedIn ? (
        <Button
          type="button"
          size="lg"
          onClick={() => setOpen(true)}
          disabled={contactDisabled}
          title={
            contactDisabled ? t(`contactState.${requestStatus}`) : undefined
          }
        >
          <MessageSquareIcon aria-hidden="true" />
          {requestStatus === "pending"
            ? t("contactState.pending")
            : t("contact")}
        </Button>
      ) : (
        <Link
          href={login}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          <MessageSquareIcon className="size-4" aria-hidden="true" />
          {t("contact")}
        </Link>
      )}
      {signedIn ? (
        <Button
          type="button"
          size="lg"
          variant="outline"
          onClick={follow}
          disabled={busy}
        >
          {following ? (
            <UserCheckIcon aria-hidden="true" />
          ) : (
            <UserPlusIcon aria-hidden="true" />
          )}
          {following ? t("followingBtn") : t("follow")}
        </Button>
      ) : (
        <Link
          href={login}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border text-sm font-semibold hover:bg-accent"
        >
          <UserPlusIcon className="size-4" aria-hidden="true" />
          {t("follow")}
        </Link>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("contactTitle", { name })}</DialogTitle>
            <DialogDescription>{t("contactHint")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div
              role="radiogroup"
              aria-label={t("topic")}
              className="flex flex-wrap gap-1.5"
            >
              {REQUEST_TOPICS.map((tp) => (
                <button
                  key={tp}
                  type="button"
                  role="radio"
                  aria-checked={topic === tp}
                  onClick={() => setTopic(tp)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-caption",
                    topic === tp
                      ? "border-brand bg-brand/10 font-semibold"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t(`topics.${tp}`)}
                </button>
              ))}
            </div>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium">{t("message")}</span>
              <textarea
                value={message}
                maxLength={500}
                rows={5}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t("messagePh")}
                className={cn(inputClass, "h-auto py-2")}
              />
              <span className="block text-right text-2xs text-faint tabular-nums">
                {message.length}/500
              </span>
            </label>
            <p className="text-2xs text-faint">{t("contactRules")}</p>
          </div>
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
    </div>
  );
}
