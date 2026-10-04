"use client";

import { ImagePlusIcon, LinkIcon, Loader2Icon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { cleanupPostUpload, createPost } from "@/app/actions/posts";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/wizard/fields";
import { Link, useRouter } from "@/i18n/navigation";
import { MAX_SCREENSHOT_INPUT_BYTES, SCREENSHOT_TYPES } from "@/lib/media";
import {
  MANUAL_POST_TYPES,
  MAX_POST_BODY,
  MAX_POST_IMAGES,
  POST_IMAGE_BUCKET,
  type ManualPostType,
} from "@/lib/posts";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { toUploadImage } from "@/lib/webp";
import { Avatar } from "./bits";

const selectCls =
  "h-9 rounded-md border border-input bg-background px-2 text-xs text-foreground";

/** Design.md §5 Composer: text, startup, type, up to 4 images, an optional link. */
export function Composer({
  me,
  startups,
  loginHref,
}: {
  me: { name: string; avatarUrl: string | null } | null;
  startups: { id: number; name: string }[];
  loginHref: string;
}) {
  const t = useTranslations("Posts");
  const router = useRouter();
  const [body, setBody] = useState("");
  const [startupId, setStartupId] = useState(startups[0]?.id ?? 0);
  const [type, setType] = useState<ManualPostType>("feature");
  const [files, setFiles] = useState<{ file: File; url: string }[]>([]);
  const [showLink, setShowLink] = useState(false);
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Free the preview object URLs when they leave the list or the composer unmounts.
  const filesRef = useRef(files);
  useEffect(() => {
    filesRef.current = files;
  }, [files]);
  useEffect(
    () => () => filesRef.current.forEach((f) => URL.revokeObjectURL(f.url)),
    [],
  );

  if (!me)
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4 text-caption text-muted-foreground">
        {t("signInToPost")}
        <Link
          href={loginHref}
          className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground hover:opacity-90"
        >
          {t("signIn")}
        </Link>
      </div>
    );
  if (!startups.length)
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed bg-card p-4 text-caption text-muted-foreground">
        {t("needWork")}
        <Link
          href="/new"
          className="font-semibold text-brand-text hover:underline"
        >
          {t("addWork")} →
        </Link>
      </div>
    );

  function pick(list: FileList | null) {
    const picked = [...(list ?? [])];
    const ok = picked.filter(
      (f) =>
        SCREENSHOT_TYPES.includes(f.type) &&
        f.size <= MAX_SCREENSHOT_INPUT_BYTES,
    );
    if (ok.length < picked.length) toast.error(t("imageRules"));
    const room = MAX_POST_IMAGES - files.length;
    if (ok.length > room) toast.error(t("imageMax", { max: MAX_POST_IMAGES }));
    setFiles((cur) => [
      ...cur,
      ...ok
        .slice(0, room)
        .map((file) => ({ file, url: URL.createObjectURL(file) })),
    ]);
  }

  async function submit() {
    setBusy(true);
    try {
      const res = await createPost({
        startupId,
        type,
        body,
        link: showLink ? link : undefined,
      });
      if (!res.ok) {
        toast.error(t(`errors.${res.error}` as "errors.failed"));
        return;
      }
      // Images go into the new post's folder; the storage policy allows that for 15 minutes.
      const db = createClient();
      const failed: string[] = [];
      for (const [position, { file }] of files.entries()) {
        try {
          const { blob, type, ext, width, height } = await toUploadImage(file);
          const path = `${res.id}/${crypto.randomUUID()}.${ext}`;
          const up = await db.storage
            .from(POST_IMAGE_BUCKET)
            .upload(path, blob, { contentType: type, upsert: false });
          if (up.error) throw up.error;
          const { error } = await db
            .from("post_images")
            .insert({ post_id: res.id, path, width, height, position });
          if (error) {
            failed.push(path);
            throw error;
          }
        } catch {
          toast.error(t("imageFailed"));
        }
      }
      if (failed.length) await cleanupPostUpload(failed);
      toast.success(t("posted"));
      router.push(`/post/${res.id}`);
    } finally {
      setBusy(false);
    }
  }

  const over = body.length > MAX_POST_BODY - 50;
  return (
    <section
      aria-label={t("composerLabel")}
      className="space-y-3 rounded-xl border bg-card p-4"
    >
      <div className="flex gap-3">
        <Avatar name={me.name} src={me.avatarUrl} />
        <textarea
          value={body}
          maxLength={MAX_POST_BODY}
          rows={3}
          aria-label={t("bodyLabel")}
          placeholder={t("placeholder")}
          onChange={(e) => setBody(e.target.value)}
          className={cn(
            inputClass,
            "h-auto min-w-0 flex-1 resize-y py-2 text-sm",
          )}
        />
      </div>

      {files.length > 0 && (
        <ul className="flex flex-wrap gap-2 sm:ml-12">
          {files.map((f, i) => (
            <li key={f.url} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element -- local preview */}
              <img
                src={f.url}
                alt={t("imageAlt", { n: i + 1 })}
                className="size-16 rounded-md border object-cover"
              />
              <button
                type="button"
                aria-label={t("removeImage", { n: i + 1 })}
                onClick={() => {
                  URL.revokeObjectURL(f.url);
                  setFiles((cur) => cur.filter((x) => x !== f));
                }}
                className="absolute -top-1.5 -right-1.5 inline-flex size-5 items-center justify-center rounded-full border bg-background"
              >
                <XIcon className="size-3" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {showLink && (
        <input
          value={link}
          inputMode="url"
          placeholder={t("linkPh")}
          aria-label={t("linkLabel")}
          onChange={(e) => setLink(e.target.value)}
          className={cn(inputClass, "sm:ml-12 sm:w-[calc(100%-3rem)]")}
        />
      )}

      <div className="flex flex-wrap items-center gap-2 sm:ml-12">
        <select
          value={startupId}
          aria-label={t("startupLabel")}
          onChange={(e) => setStartupId(Number(e.target.value))}
          className={cn(selectCls, "max-w-40")}
        >
          {startups.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          value={type}
          aria-label={t("typeLabel")}
          onChange={(e) => setType(e.target.value as ManualPostType)}
          className={selectCls}
        >
          {MANUAL_POST_TYPES.map((x) => (
            <option key={x} value={x}>
              {t(`types.${x}`)}
            </option>
          ))}
        </select>
        <input
          ref={fileRef}
          type="file"
          accept={SCREENSHOT_TYPES.join(",")}
          multiple
          hidden
          onChange={(e) => {
            pick(e.target.files);
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={t("addImage")}
          disabled={files.length >= MAX_POST_IMAGES}
          onClick={() => fileRef.current?.click()}
        >
          <ImagePlusIcon aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant={showLink ? "secondary" : "outline"}
          size="icon"
          aria-label={t("addLink")}
          aria-pressed={showLink}
          onClick={() => setShowLink((v) => !v)}
        >
          <LinkIcon aria-hidden="true" />
        </Button>
        <span
          className={cn(
            "ml-auto text-2xs tabular-nums",
            over ? "text-warning" : "text-faint",
          )}
        >
          {body.length} / {MAX_POST_BODY}
        </span>
        <Button type="button" onClick={submit} disabled={busy || !body.trim()}>
          {busy && <Loader2Icon className="animate-spin" aria-hidden="true" />}
          {t("post")}
        </Button>
      </div>
      <p className="text-2xs text-faint sm:ml-12">{t("rules")}</p>
    </section>
  );
}
