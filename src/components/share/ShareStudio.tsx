"use client";

import { SegmentedControl } from "@/components/core/SegmentedControl";
import {
  CalendarIcon,
  CheckIcon,
  CopyIcon,
  DownloadIcon,
  MessageSquareTextIcon,
  RectangleHorizontalIcon,
  Share2Icon,
  TrendingUpIcon,
  type LucideIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, useSyncExternalStore } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { shareLinks } from "@/lib/share";
import {
  CALENDAR_PERIODS,
  CHART_PERIODS,
  type CardKind,
} from "@/lib/share-card";
import { SWATCHES, SWATCH_IDS, type SwatchId } from "@/lib/share-palette";
import { cn } from "@/lib/utils";
import { copy } from "./copy";

// Design.md §5 ShareStudio (spec 6.5): link + Copy ("copied ✓" 2 s), SegmentedControl tabs
// Badge / Chart / Calendar / Post, theme + period + colour, server-rendered preview, Download as
// {slug}-{tab}.png, embeddable SVG badge with README/HTML code. Opens from the profile's Share
// button and automatically after listing/verifying (?new=1 / ?verified=1).

type Tab = CardKind | "post";
const TABS: { id: Tab; icon: LucideIcon }[] = [
  { id: "badge", icon: RectangleHorizontalIcon },
  { id: "chart", icon: TrendingUpIcon },
  { id: "calendar", icon: CalendarIcon },
  { id: "post", icon: MessageSquareTextIcon },
];

const noop = () => () => {};

function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-2xs text-faint">{label}</p>
      <SegmentedControl
        label={label}
        value={value}
        options={options}
        onChange={onChange}
      />
    </div>
  );
}

export function ShareStudio({
  slug,
  url,
  post,
  text,
  badgeHtml,
  badgeMarkdown,
  badgeSrc,
  currencySymbol,
}: {
  slug: string;
  /** Absolute profile URL. */
  url: string;
  /** Ready-to-paste post for the Claude Thailand thread. */
  post: string;
  /** Short text for X / native share. */
  text: string;
  badgeHtml: string;
  /** Spec 6.5 "คัดลอกโค้ด README". */
  badgeMarkdown: string;
  /** Absolute `/api/badge/{slug}.svg` URL (embed preview). */
  badgeSrc: string;
  /** "฿" or "$": the calendar heatmap glyph for this project. */
  currencySymbol: string;
}) {
  const t = useTranslations("Share");
  const locale = useLocale();
  // Read the query client-side so the profile page stays ISR-cached.
  const search = useSyncExternalStore(
    noop,
    () => window.location.search,
    () => "",
  );
  const params = new URLSearchParams(search);
  const auto = params.has("verified")
    ? "verified"
    : params.has("new")
      ? "new"
      : null;
  const [dismissed, setDismissed] = useState(false);
  const [manual, setManual] = useState(false);
  const open = manual || (auto !== null && !dismissed);

  const [tab, setTab] = useState<Tab>(auto ? "post" : "badge");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [color, setColor] = useState<SwatchId>("indigo");
  const [chartPeriod, setChartPeriod] = useState<number>(30);
  const [calPeriod, setCalPeriod] = useState<number>(12);
  const links = shareLinks(url, text);
  // Spec 6.5: the button itself says "คัดลอกแล้ว ✓" for 2 s.
  const [copied, setCopied] = useState<string | null>(null);
  async function copyInline(value: string, id: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(id);
      setTimeout(() => setCopied((c) => (c === id ? null : c)), 2000);
    } catch {
      copy(value, t("copy"));
    }
  }
  const copyLabel = (id: string, label: string) =>
    copied === id ? (
      <>
        <CheckIcon className="size-3.5" aria-hidden="true" />
        {t("copied")}
      </>
    ) : (
      <>
        <CopyIcon className="size-3.5" aria-hidden="true" />
        {label}
      </>
    );

  function onOpenChange(next: boolean) {
    setManual(next);
    if (!next && auto) {
      setDismissed(true);
      const u = new URL(window.location.href);
      u.searchParams.delete("new");
      u.searchParams.delete("verified");
      window.history.replaceState(null, "", u);
    }
  }

  const kind = tab === "post" ? null : tab;
  const period = tab === "calendar" ? calPeriod : chartPeriod;
  const img = kind
    ? `/api/share-card/${slug}?${new URLSearchParams({
        kind,
        theme,
        color,
        period: String(period),
        locale,
      })}`
    : null;

  const outlineBtn =
    "inline-flex h-8 items-center gap-1.5 rounded-md border bg-card px-3 text-xs font-medium transition-colors hover:bg-accent";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <button type="button" className={outlineBtn}>
          <Share2Icon className="size-3.5" aria-hidden="true" />
          {t("share")}
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold">
            {auto === "verified"
              ? t("titleVerified")
              : auto === "new"
                ? t("titleNew")
                : t("studioTitle")}
          </DialogTitle>
          <DialogDescription className="text-caption">
            {tab === "post" ? t("body") : t("studioBody")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <p className="text-2xs text-faint">{t("link")}</p>
          <div className="flex gap-2">
            <input
              readOnly
              value={url}
              aria-label={t("link")}
              onFocus={(e) => e.currentTarget.select()}
              className="h-8 min-w-0 flex-1 rounded-md border border-input bg-card px-2.5 text-caption"
            />
            <button
              type="button"
              onClick={() => copyInline(url, "link")}
              aria-live="polite"
              className={cn(outlineBtn, "min-w-24 justify-center")}
            >
              {copyLabel("link", t("copy"))}
            </button>
          </div>
        </div>

        <SegmentedControl
          label={t("tabs")}
          value={tab}
          onChange={setTab}
          options={TABS.map(({ id, icon: Icon }) => ({
            value: id,
            label: (
              <span className="flex items-center justify-center gap-1.5">
                <Icon className="size-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{t(`tab.${id}`)}</span>
              </span>
            ),
          }))}
        />

        {kind && img ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <Segmented
                label={t("theme")}
                value={theme}
                onChange={setTheme}
                options={[
                  { value: "light", label: t("light") },
                  { value: "dark", label: t("dark") },
                ]}
              />
              {kind === "chart" && (
                <Segmented
                  label={t("period")}
                  value={chartPeriod}
                  onChange={setChartPeriod}
                  options={CHART_PERIODS.map((p) => ({
                    value: p,
                    label:
                      p === 365 ? t("months", { n: 12 }) : t("days", { n: p }),
                  }))}
                />
              )}
              {kind === "calendar" && (
                <Segmented
                  label={t("period")}
                  value={calPeriod}
                  onChange={setCalPeriod}
                  options={[...CALENDAR_PERIODS].reverse().map((p) => ({
                    value: p,
                    label: t("months", { n: p }),
                  }))}
                />
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-2xs text-faint">
                <span>
                  {kind === "chart"
                    ? t("lineColor")
                    : kind === "calendar"
                      ? t("glyphColor", { symbol: currencySymbol })
                      : t("color")}
                </span>
                <span>{t(`swatch.${color}`)}</span>
              </div>
              <div
                role="radiogroup"
                aria-label={t("color")}
                className="flex flex-wrap justify-between gap-1.5 rounded-lg border bg-card p-2"
              >
                {SWATCH_IDS.map((id) => (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={color === id}
                    aria-label={t(`swatch.${id}`)}
                    title={t(`swatch.${id}`)}
                    onClick={() => setColor(id)}
                    // Swatch dots show the palette itself (Design.md §9 renderer palette).
                    style={{ backgroundColor: SWATCHES[id] }}
                    className={cn(
                      "flex size-6 items-center justify-center rounded-full ring-offset-2 ring-offset-card transition-shadow",
                      color === id && "ring-2 ring-foreground",
                    )}
                  >
                    {color === id && (
                      <CheckIcon
                        className="size-3.5 text-white"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl border bg-card p-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- our own image route, sized by the server */}
              <img
                key={img}
                src={img}
                alt={t("previewAlt")}
                className="w-full rounded-lg"
              />
            </div>

            {kind === "badge" && (
              <div className="space-y-2 rounded-xl border bg-card p-3">
                <p className="text-xs font-semibold">{t("badgeTitle")}</p>
                <p className="text-caption text-muted-foreground">
                  {t("badgeBody")}
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element -- SVG badge from our API */}
                <img
                  src={`${badgeSrc}${theme === "light" ? "?theme=light" : ""}`}
                  alt=""
                  height={28}
                  className="h-7 w-auto"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => copyInline(badgeMarkdown, "readme")}
                    className={outlineBtn}
                  >
                    {copyLabel("readme", t("copyReadme"))}
                  </button>
                  <button
                    type="button"
                    onClick={() => copyInline(badgeHtml, "html")}
                    className={outlineBtn}
                  >
                    {copyLabel("html", t("copyBadge"))}
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <a
                href={img}
                download={`${slug}-${kind}.png`}
                className={outlineBtn}
              >
                <DownloadIcon className="size-3.5" aria-hidden="true" />
                {t("download")}
              </a>
            </div>
          </>
        ) : (
          <>
            <pre className="rounded-lg border bg-card p-3 font-sans text-caption whitespace-pre-wrap">
              {post}
            </pre>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => copy(post, t("postCopied"))}
                className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground hover:opacity-90"
              >
                <CopyIcon className="size-3.5" aria-hidden="true" />
                {t("copyPost")}
              </button>
              <a
                href={links.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className={outlineBtn}
              >
                {t("facebook")}
              </a>
              <a
                href={links.line}
                target="_blank"
                rel="noopener noreferrer"
                className={outlineBtn}
              >
                {t("line")}
              </a>
              <a
                href={links.x}
                target="_blank"
                rel="noopener noreferrer"
                className={outlineBtn}
              >
                {t("x")}
              </a>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
