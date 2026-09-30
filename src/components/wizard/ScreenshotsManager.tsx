"use client";

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ImagePlusIcon,
  Loader2Icon,
  XIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  MAX_SCREENSHOTS,
  MAX_SCREENSHOT_INPUT_BYTES,
  SCREENSHOT_KINDS,
  SCREENSHOT_TYPES,
  detectKind,
  fitWithin,
  screenshotUrl,
  type Screenshot,
  type ScreenshotKind,
} from "@/lib/media";
import { revalidateStartup } from "@/app/actions/revalidate";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { inputClass } from "./fields";

const BUCKET = "screenshots";
const MAX_UPLOAD_BYTES = 3 * 1024 * 1024; // bucket limit

/**
 * Resize to ≤ 2400px and re-encode as WebP in the browser. Drawing onto a canvas drops all
 * metadata, so EXIF (incl. GPS) never leaves the device.
 */
async function toWebp(
  file: File,
): Promise<{ blob: Blob; width: number; height: number }> {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  const { width, height } = fitWithin(bmp.width, bmp.height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, width, height);
  bmp.close();
  for (const q of [0.85, 0.75, 0.6, 0.45]) {
    const blob = await new Promise<Blob | null>((r) =>
      canvas.toBlob(r, "image/webp", q),
    );
    if (!blob || blob.type !== "image/webp") throw new Error("no-webp");
    if (blob.size <= MAX_UPLOAD_BYTES) return { blob, width, height };
  }
  throw new Error("too-big");
}

/** Design.md §5 ScreenshotsManager (spec 6.9 "ภาพผลงาน"). */
export function ScreenshotsManager({
  startupId,
  initial,
  onCountChange,
}: {
  startupId: number;
  initial: Screenshot[];
  /** Lets the edit page's progress header count screenshots. */
  onCountChange?: (count: number) => void;
}) {
  const t = useTranslations("Shots");
  const [shots, setShots] = useState<Screenshot[]>(initial);
  const shotsRef = useRef(shots);
  useEffect(() => {
    shotsRef.current = shots;
    onCountChange?.(shots.length);
  }, [shots, onCountChange]);
  const [busy, setBusy] = useState(0);
  const [over, setOver] = useState(false);
  const dragFrom = useRef<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const db = () => createClient();

  async function add(files: File[]) {
    const room = MAX_SCREENSHOTS - shots.length - busy;
    if (room <= 0) return toast.error(t("tooMany", { max: MAX_SCREENSHOTS }));
    const picked = files.filter((f) => SCREENSHOT_TYPES.includes(f.type));
    if (picked.length < files.length) toast.error(t("badType"));
    const ok = picked.filter((f) => f.size <= MAX_SCREENSHOT_INPUT_BYTES);
    if (ok.length < picked.length) toast.error(t("tooLarge"));
    const batch = ok.slice(0, room);
    if (ok.length > room) toast.error(t("tooMany", { max: MAX_SCREENSHOTS }));
    setBusy((b) => b + batch.length);

    for (const file of batch) {
      try {
        const { blob, width, height } = await toWebp(file);
        const path = `${startupId}/${crypto.randomUUID()}.webp`;
        const up = await db()
          .storage.from(BUCKET)
          .upload(path, blob, { contentType: "image/webp", upsert: false });
        if (up.error) throw up.error;
        // Sequential uploads: the ref holds the list as of the last render.
        const position = shotsRef.current.length;
        const { data, error } = await db()
          .from("startup_screenshots")
          .insert({
            startup_id: startupId,
            path,
            kind: detectKind(width, height),
            width,
            height,
            position,
          })
          .select("id, path, kind, caption, width, height, position")
          .single();
        if (error) {
          await db().storage.from(BUCKET).remove([path]);
          throw error;
        }
        setShots((s) => [...s, data as Screenshot]);
        void revalidateStartup(startupId);
      } catch (e) {
        toast.error(
          e instanceof Error && e.message === "no-webp"
            ? t("noWebp")
            : t("uploadFailed"),
        );
      } finally {
        setBusy((b) => b - 1);
      }
    }
  }

  // Ctrl/Cmd+V anywhere on the page adds pasted images.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = [...(e.clipboardData?.files ?? [])].filter((f) =>
        f.type.startsWith("image/"),
      );
      if (files.length) {
        e.preventDefault();
        void add(files);
      }
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  });

  async function update(
    id: number,
    patch: Partial<Pick<Screenshot, "caption" | "kind" | "position">>,
  ) {
    const { error } = await db()
      .from("startup_screenshots")
      .update(patch)
      .eq("id", id);
    if (error) toast.error(t("saveFailed"));
    else void revalidateStartup(startupId);
  }

  async function reorder(from: number, to: number) {
    if (from === to || to < 0 || to >= shots.length) return;
    const next = [...shots];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    const withPos = next.map((s, i) => ({ ...s, position: i }));
    setShots(withPos);
    await Promise.all(
      withPos
        .filter((s, i) => shots.find((o) => o.id === s.id)?.position !== i)
        .map((s) => update(s.id, { position: s.position })),
    );
  }

  async function remove(s: Screenshot) {
    const { error } = await db()
      .from("startup_screenshots")
      .delete()
      .eq("id", s.id);
    if (error) return toast.error(t("saveFailed"));
    await db().storage.from(BUCKET).remove([s.path]);
    setShots((all) => all.filter((x) => x.id !== s.id));
    void revalidateStartup(startupId);
  }

  const full = shots.length + busy >= MAX_SCREENSHOTS;

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("Files")) {
            e.preventDefault();
            setOver(true);
          }
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          if (!e.dataTransfer.files.length) return;
          e.preventDefault();
          setOver(false);
          void add([...e.dataTransfer.files]);
        }}
        className={cn(
          "flex flex-col items-center gap-2 rounded-xl border border-dashed p-6 text-center transition-colors",
          over && "border-brand bg-brand/5",
          full && "opacity-50",
        )}
      >
        <ImagePlusIcon
          className="size-6 text-muted-foreground"
          aria-hidden="true"
        />
        <p className="text-xs text-muted-foreground">{t("dropHint")}</p>
        <button
          type="button"
          disabled={full}
          onClick={() => fileRef.current?.click()}
          className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:cursor-not-allowed"
        >
          {t("choose")}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept={SCREENSHOT_TYPES.join(",")}
          multiple
          hidden
          onChange={(e) => {
            void add([...(e.target.files ?? [])]);
            e.target.value = "";
          }}
        />
        <p className="text-2xs text-faint">
          {t("limits", { count: shots.length, max: MAX_SCREENSHOTS })}
        </p>
      </div>

      {(shots.length > 0 || busy > 0) && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {shots.map((s, i) => (
            <li
              key={s.id}
              draggable
              onDragStart={(e) => {
                dragFrom.current = i;
                e.dataTransfer.effectAllowed = "move";
              }}
              onDragOver={(e) => {
                if (dragFrom.current !== null) e.preventDefault();
              }}
              onDrop={(e) => {
                if (dragFrom.current === null) return;
                e.preventDefault();
                void reorder(dragFrom.current, i);
                dragFrom.current = null;
              }}
              className="space-y-1.5 rounded-lg border bg-card p-2"
            >
              <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element -- owner-only thumbnail */}
                <img
                  src={screenshotUrl(s.path)}
                  alt={s.caption || t("thumbAlt", { n: i + 1 })}
                  className="size-full object-cover object-top"
                />
                {i === 0 && (
                  <span className="absolute top-1 left-1 rounded-sm bg-background/90 px-1.5 py-0.5 text-3xs font-bold tracking-wider uppercase">
                    {t("cover")}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => void remove(s)}
                  aria-label={t("remove", { n: i + 1 })}
                  className="absolute top-1 right-1 inline-flex size-6 items-center justify-center rounded-full bg-background/90 text-muted-foreground hover:text-foreground"
                >
                  <XIcon className="size-3.5" aria-hidden="true" />
                </button>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => void reorder(i, i - 1)}
                  disabled={i === 0}
                  aria-label={t("moveLeft", { n: i + 1 })}
                  className="inline-flex size-7 items-center justify-center rounded-md border text-muted-foreground disabled:opacity-30"
                >
                  <ChevronLeftIcon className="size-3.5" aria-hidden="true" />
                </button>
                <select
                  value={s.kind}
                  aria-label={t("kind", { n: i + 1 })}
                  onChange={(e) => {
                    const kind = e.target.value as ScreenshotKind;
                    setShots((all) =>
                      all.map((x) => (x.id === s.id ? { ...x, kind } : x)),
                    );
                    void update(s.id, { kind });
                  }}
                  className="h-7 min-w-0 flex-1 rounded-md border bg-input/30 px-1 text-2xs"
                >
                  {SCREENSHOT_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {t(`kinds.${k}`)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => void reorder(i, i + 1)}
                  disabled={i === shots.length - 1}
                  aria-label={t("moveRight", { n: i + 1 })}
                  className="inline-flex size-7 items-center justify-center rounded-md border text-muted-foreground disabled:opacity-30"
                >
                  <ChevronRightIcon className="size-3.5" aria-hidden="true" />
                </button>
              </div>
              <input
                aria-label={t("caption", { n: i + 1 })}
                placeholder={t("captionPlaceholder")}
                maxLength={60}
                defaultValue={s.caption ?? ""}
                onBlur={(e) => {
                  const caption = e.target.value.trim() || null;
                  if (caption !== s.caption) {
                    setShots((all) =>
                      all.map((x) => (x.id === s.id ? { ...x, caption } : x)),
                    );
                    void update(s.id, { caption });
                  }
                }}
                className={cn(inputClass, "h-7 px-2 text-2xs")}
              />
            </li>
          ))}
          {Array.from({ length: busy }, (_, i) => (
            <li
              key={`busy-${i}`}
              className="flex aspect-[4/3] items-center justify-center rounded-lg border bg-muted"
            >
              <Loader2Icon
                className="size-5 animate-spin text-muted-foreground"
                aria-label={t("uploading")}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
