"use client";

import { CameraIcon, Loader2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { resetAvatar, uploadAvatar } from "@/app/actions/profile";
import { Avatar } from "@/components/posts/bits";
import { useRouter } from "@/i18n/navigation";
import { announceAvatar } from "@/lib/avatar-events";
import { toAvatarImage } from "@/lib/webp";

/**
 * Design.md §6 Profile editor › ข้อมูลพื้นฐาน: the profile photo. Saved on its own (not part of the
 * form's unsaved changes): picked → centre-cropped to a 512 px WebP (JPEG on Safari) in the browser
 * → uploaded. After the server confirms, the stored URL is shown here and announced to the header.
 */
export function AvatarField({
  name,
  url,
  provider,
}: {
  name: string;
  url: string | null;
  /** The Google / GitHub sign-in photo, offered when the current photo is something else. */
  provider: { url: string; name: string } | null;
}) {
  const t = useTranslations("Me");
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [current, setCurrent] = useState(url);
  const [busy, start] = useTransition();

  const fail = (key: string): void => {
    toast.error(
      t.has(`errors.${key}`) ? t(`errors.${key}`) : t("errors.save_failed"),
    );
  };

  const pick = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return fail("avatar_type");
    start(async () => {
      let blob: Blob;
      try {
        blob = await toAvatarImage(file);
      } catch {
        return fail("avatar_read");
      }
      const form = new FormData();
      form.set("file", new File([blob], "avatar", { type: blob.type }));
      const res = await uploadAvatar(form);
      if (!res.ok) return fail(res.error);
      done(res.url, t("photoUpdated"));
    });
  };

  const reset = (mode: "provider" | "none") =>
    start(async () => {
      const res = await resetAvatar(mode);
      if (!res.ok) return fail(res.error);
      done(
        res.url,
        mode === "provider"
          ? t("photoUsingProvider", { provider: provider?.name ?? "" })
          : t("photoRemoved"),
      );
    });

  /** The server confirmed: show the stored photo here and in the header, refresh the page data. */
  function done(stored: string | null, message: string) {
    setCurrent(stored);
    announceAvatar(stored);
    toast.success(message);
    router.refresh();
  }

  const link =
    "text-caption font-semibold text-muted-foreground hover:text-foreground hover:underline disabled:opacity-50";
  return (
    <div className="flex items-center gap-4">
      <Avatar name={name || "?"} src={current} size={72} className="text-sm" />
      <div className="min-w-0 space-y-1.5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <button
            type="button"
            disabled={busy}
            onClick={() => input.current?.click()}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-caption font-semibold hover:bg-accent disabled:opacity-50"
          >
            {busy ? (
              <Loader2Icon
                className="size-3.5 animate-spin"
                aria-hidden="true"
              />
            ) : (
              <CameraIcon className="size-3.5" aria-hidden="true" />
            )}
            {busy ? t("photoSaving") : t("photoChange")}
          </button>
          {provider && current !== provider.url && (
            <button
              type="button"
              disabled={busy}
              onClick={() => reset("provider")}
              className={link}
            >
              {t("photoUseProvider", { provider: provider.name })}
            </button>
          )}
          {current && (
            <button
              type="button"
              disabled={busy}
              onClick={() => reset("none")}
              className={link}
            >
              {t("photoRemove")}
            </button>
          )}
        </div>
        <p className="text-2xs text-faint">{t("photoHint")}</p>
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          className="sr-only"
          tabIndex={-1}
          aria-label={t("photoChange")}
          onChange={(e) => {
            pick(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
