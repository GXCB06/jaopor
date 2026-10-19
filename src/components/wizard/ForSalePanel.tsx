"use client";

import { Loader2Icon, ShieldAlertIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { saveListing } from "@/app/actions/listing";
import { ForSaleBanner } from "@/components/listing/ForSaleBanner";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/wizard/fields";
import { useRouter } from "@/i18n/navigation";
import type { ListingStats, OwnerListing } from "@/lib/data/listing";
import type { DisclosureLevel } from "@/lib/disclosure";
import {
  SALE_NOTE_MAX,
  askingPriceUsd,
  listingMultiple,
  parseAskingPrice,
} from "@/lib/listing";
import { cn } from "@/lib/utils";

const TEAM_EMAIL = "jaopordev@gmail.com";

/** What the preview needs to show the banner exactly as visitors would see it. */
export type ForSalePreviewData = {
  status: string;
  isDemo: boolean;
  /** Public revenue as visitors see it (level + MRR in USD cents, null below exact). */
  revenueLevel: Exclude<DisclosureLevel, "private"> | null;
  mrrCents: number | null;
  source: string | null;
  fx: { rate: number; date: string | null } | null;
};

/**
 * Design.md "For-sale listing" §2: the owner's section on the edit page. Switch, price in whole
 * baht, an optional reason, notes on what is public, a live preview of the banner, and the
 * moderator's note when a moderator hid the listing (the switch can't undo that). Saves on its own.
 */
export function ForSalePanel({
  startupId,
  initial,
  stats,
  preview,
}: {
  startupId: number;
  initial: OwnerListing | null;
  stats: ListingStats | null;
  preview: ForSalePreviewData;
}) {
  const t = useTranslations("ForSale.owner");
  const sale = useTranslations("ForSale");
  const format = useFormatter();
  const router = useRouter();
  const [on, setOn] = useState(initial?.forSale ?? false);
  const [price, setPrice] = useState(
    initial?.priceThb ? initial.priceThb.toLocaleString("en-US") : "",
  );
  const [note, setNote] = useState(initial?.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();

  const priceThb = price.trim() ? parseAskingPrice(price) : null;
  const multiple =
    priceThb !== null
      ? listingMultiple({
          priceThb,
          revenueLevel: preview.revenueLevel,
          mrrCents: preview.mrrCents,
          isDemo: preview.isDemo,
          thbPerUsd: preview.fx?.rate ?? null,
        })
      : null;
  const usd =
    priceThb !== null && preview.fx
      ? askingPriceUsd(priceThb, preview.fx.rate)
      : null;

  const save = () =>
    start(async () => {
      setError(null);
      const res = await saveListing(startupId, {
        forSale: on,
        price,
        note,
      });
      if (!res.ok) {
        setError(t(`errors.${res.error as "failed"}`));
        return;
      }
      toast.success(t("saved"));
      router.refresh();
    });

  const switchId = "for-sale-switch";
  return (
    <div className="space-y-4">
      {initial?.hidden && (
        <div
          role="status"
          className="space-y-1 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-caption"
        >
          <p className="flex items-center gap-2 font-semibold text-destructive">
            <ShieldAlertIcon className="size-4 shrink-0" aria-hidden="true" />
            {t("hiddenTitle")}
          </p>
          {initial.hiddenReason && (
            <p className="break-words">
              {t("hiddenReason", { reason: initial.hiddenReason })}
            </p>
          )}
          <p className="text-muted-foreground">{t("hiddenBody")}</p>
          <a
            href={`mailto:${TEAM_EMAIL}`}
            className="text-brand-text hover:underline"
          >
            {t("hiddenContact")}
          </a>
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p id={switchId} className="text-xs font-semibold">
            {t("switchLabel")}
          </p>
          <p className="text-caption text-muted-foreground">{t("intro")}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-labelledby={switchId}
          onClick={() => setOn((v) => !v)}
          className={cn(
            "relative mt-0.5 h-5 w-9 shrink-0 rounded-full border transition-colors",
            on ? "border-brand bg-brand" : "bg-secondary",
          )}
        >
          <span
            className={cn(
              "absolute top-1/2 size-3.5 -translate-y-1/2 rounded-full bg-foreground transition-all",
              on ? "left-4.5 bg-white" : "left-0.5",
            )}
          />
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="text-caption font-semibold">{t("price")}</span>
          <input
            inputMode="numeric"
            autoComplete="off"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="1,500,000"
            aria-invalid={price.trim() !== "" && priceThb === null}
            className={cn(inputClass, "tabular-nums")}
          />
          <span className="block text-2xs text-faint">{t("priceHint")}</span>
        </label>
        <label className="block space-y-1.5">
          <span className="flex items-baseline justify-between gap-2 text-caption font-semibold">
            {t("note")}
            <span className="text-2xs font-normal text-faint tabular-nums">
              {note.length}/{SALE_NOTE_MAX}
            </span>
          </span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={SALE_NOTE_MAX}
            rows={2}
            placeholder={t("notePh")}
            className={cn(inputClass, "h-auto py-2")}
          />
        </label>
      </div>

      <ul className="list-disc space-y-1 pl-5 text-caption text-muted-foreground">
        <li>{t("noteMultiple")}</li>
        <li>{t("noteUsd")}</li>
        <li>{t("noteContact")}</li>
      </ul>

      {initial?.forSale && initial.listedAt && (
        <p className="text-caption text-muted-foreground tabular-nums">
          {sale("listedSince", {
            date: format.dateTime(new Date(initial.listedAt), {
              day: "numeric",
              month: "short",
              year: "numeric",
            }),
          })}
          {stats &&
            ` · ${t("stats", { views: stats.views, interested: stats.interested })}`}
        </p>
      )}

      <div className="space-y-2">
        <p className="text-2xs font-semibold tracking-wider text-faint uppercase">
          {t("preview")}
        </p>
        {!on ? (
          <p className="rounded-lg border border-dashed p-3 text-caption text-muted-foreground">
            {t("previewOff")}
          </p>
        ) : preview.status !== "published" ? (
          <p className="rounded-lg border border-dashed p-3 text-caption text-muted-foreground">
            {t("previewPrivate")}
          </p>
        ) : priceThb !== null ? (
          <ForSaleBanner
            listing={{ priceThb, note: note.trim() || null, listedAt: null }}
            multiple={multiple}
            multipleSource={preview.source}
            usd={
              usd !== null
                ? { amount: usd, date: preview.fx?.date ?? null }
                : null
            }
            stats={null}
          />
        ) : (
          <p className="rounded-lg border border-dashed p-3 text-caption text-muted-foreground">
            {t("errors.priceRequired")}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3 border-t pt-4">
        {error && (
          <p role="alert" className="mr-auto text-caption text-destructive">
            {error}
          </p>
        )}
        <Button type="button" onClick={save} disabled={busy}>
          {busy && <Loader2Icon className="animate-spin" aria-hidden="true" />}
          {t("save")}
        </Button>
      </div>
    </div>
  );
}
