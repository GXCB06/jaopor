"use client";

import { useTranslations } from "next-intl";
import { StartupLogo } from "@/components/StartupBits";

export const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"];

/**
 * Design.md §5 LogoField: the one logo control for Add-project and the edit page. A 48 px tile
 * showing the current logo (or the first letter), "อัปโหลดเอง" (a styled label around a hidden file
 * input, so no browser "Choose File" text) and "ลบโลโก้" when there is one.
 */
export function LogoField({
  id,
  name,
  src,
  onPick,
  onRemove,
}: {
  id: string;
  /** For the letter tile when there is no logo. */
  name: string;
  /** What to show: a local object / data URL, or the stored logo's public URL. */
  src: string | null;
  onPick: (file: File) => void;
  onRemove: () => void;
}) {
  const t = useTranslations("Wizard");
  return (
    <div className="flex flex-wrap items-center gap-3">
      <StartupLogo
        name={name.trim() || "?"}
        src={src}
        size={48}
        className="rounded-xl"
      />
      <label
        htmlFor={id}
        className="inline-flex h-8 cursor-pointer items-center rounded-md border bg-input/30 px-3 text-xs focus-within:ring-2 focus-within:ring-ring hover:bg-accent"
      >
        {t("logoUpload")}
        <input
          id={id}
          type="file"
          accept={LOGO_TYPES.join(",")}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onPick(file);
            // Picking the same file again after "remove" still fires a change.
            e.target.value = "";
          }}
          className="sr-only"
        />
      </label>
      {src && (
        <button
          type="button"
          onClick={onRemove}
          className="text-xs text-muted-foreground hover:text-destructive"
        >
          {t("logoRemove")}
        </button>
      )}
    </div>
  );
}
