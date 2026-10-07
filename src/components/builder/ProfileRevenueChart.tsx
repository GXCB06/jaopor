"use client";

import { CheckIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { useCurrency } from "@/lib/currency";
import type { BuilderRevenue } from "@/lib/data/builder";
import { formatMoney } from "@/lib/format";
import {
  niceCeil,
  revenueWindow,
  worksLabel,
  type RevenueRange,
} from "@/lib/profile-revenue";
import { cn } from "@/lib/utils";

const W = 1000;
const BASE = 190;
const TOP = 8;

/**
 * Design.md §6 "Profile revenue dashboard": the range total, growth vs the previous period, the
 * daily (or monthly) line with the previous period dashed behind it, and today as the partial point.
 */
export function ProfileRevenueChart({
  data,
  range,
  thbPerUsd,
  sources,
}: {
  data: BuilderRevenue;
  range: RevenueRange;
  thbPerUsd: number | null;
  /** Display names of the verifying providers ("Stripe, RevenueCat"). */
  sources: string;
}) {
  const t = useTranslations("Builder");
  const locale = useLocale();
  const picked = useCurrency();
  const currency = picked === "thb" && thbPerUsd ? "thb" : "usd";
  const rate = currency === "thb" ? thbPerUsd! : 1;
  const [hover, setHover] = useState<number | null>(null);
  const plot = useRef<HTMLDivElement>(null);

  const w = revenueWindow(
    data.daily,
    data.start,
    data.today,
    data.todayKey,
    range,
  );
  const n = w.points.length;
  const shown = (cents: number) => (cents / 100) * rate;
  const full = (cents: number | null) =>
    cents === null ? "—" : formatMoney(shown(cents), currency);
  const top = niceCeil(shown(w.max));
  const x = (i: number) => (n === 1 ? W / 2 : (i * W) / (n - 1));
  const y = (cents: number) => BASE - (shown(cents) / top) * (BASE - TOP);
  const pct = (i: number) => (x(i) / W) * 100;

  // Paths: gaps where there is no data; the partial point gets its own dashed segment.
  const line = (pick: (i: number) => number | null, upTo: number) => {
    let d = "";
    let open = false;
    for (let i = 0; i < upTo; i++) {
      const v = pick(i);
      if (v === null) {
        open = false;
        continue;
      }
      d += `${open ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)} `;
      open = true;
    }
    return d;
  };
  const partialAt = w.points.findIndex((p) => p.partial);
  const complete = partialAt === -1 ? n : partialAt;
  const valueAt = (i: number) => w.points[i].value;
  const main = line(valueAt, complete);
  const prev = line((i) => w.points[i].prev, n);
  let area = "";
  {
    let run: number[] = [];
    const flush = () => {
      if (run.length > 1)
        area += `M${x(run[0]).toFixed(1)} ${BASE} ${run
          .map((i) => `L${x(i).toFixed(1)} ${y(valueAt(i)!).toFixed(1)}`)
          .join(" ")} L${x(run.at(-1)!).toFixed(1)} ${BASE} Z `;
      run = [];
    };
    for (let i = 0; i < complete; i++) {
      if (valueAt(i) === null) flush();
      else run.push(i);
    }
    flush();
  }
  const partial =
    partialAt > 0 &&
    valueAt(partialAt) !== null &&
    valueAt(partialAt - 1) !== null
      ? `M${x(partialAt - 1).toFixed(1)} ${y(valueAt(partialAt - 1)!).toFixed(1)} L${x(partialAt).toFixed(1)} ${y(valueAt(partialAt)!).toFixed(1)}`
      : "";

  const intl = locale === "th" ? "th-TH" : "en";
  const dayFmt = new Intl.DateTimeFormat(intl, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
  const monthFmt = new Intl.DateTimeFormat(intl, {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  });
  const keyDate = (key: string) =>
    new Date(`${key.length === 7 ? `${key}-01` : key}T00:00:00Z`);
  const label = (i: number) => {
    const p = w.points[i];
    if (p.partial)
      return w.unit === "day" ? t("todayPartial") : t("monthPartial");
    return (w.unit === "day" ? dayFmt : monthFmt).format(keyDate(p.key));
  };
  const ticks = [
    ...new Set([0, 1, 2, 3, 4].map((k) => Math.round((k * (n - 1)) / 4))),
  ];
  const axis = (v: number) => formatMoney(v, currency, { compact: true });
  const synced = data.syncedAt
    ? new Intl.DateTimeFormat(intl, {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Bangkok",
      }).format(new Date(data.syncedAt))
    : null;

  const pick = (clientX: number) => {
    const r = plot.current?.getBoundingClientRect();
    if (!r || r.width === 0) return;
    const ratio = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    setHover(Math.round(ratio * (n - 1)));
  };
  const h = hover === null ? null : w.points[hover];
  const rangeName = t(`range.${range}`);

  return (
    <div className="space-y-3.5">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
        <span className="text-3xl font-extrabold tabular-nums">
          {full(w.total)}
        </span>
        {w.growth !== null && (
          <span
            className={cn(
              "text-caption tabular-nums",
              w.growth >= 0 ? "text-positive" : "text-negative",
            )}
          >
            {w.growth >= 0 ? "↑" : "↓"} {Math.abs(Math.round(w.growth))}%{" "}
            {t("vsPrevPeriod")}
          </span>
        )}
        <span className="flex-1" />
        <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-2xs text-muted-foreground">
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <span
              aria-hidden="true"
              className="h-[3px] w-2.5 shrink-0 rounded-full bg-brand"
            />
            <span className="truncate">{worksLabel(data.names)}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="w-2.5 border-t-2 border-dashed border-muted-foreground/70"
            />
            {t("prevPeriod")}
          </span>
        </span>
      </div>

      <div className="grid grid-cols-[2.75rem_minmax(0,1fr)] gap-x-2.5">
        <div
          aria-hidden="true"
          className="flex h-[200px] flex-col justify-between text-right text-3xs text-faint tabular-nums"
        >
          {/* All zero: only the baseline label (a "฿1" scale would be made up). */}
          <span>{w.max > 0 ? axis(top) : ""}</span>
          <span>{w.max > 0 ? axis(top / 2) : ""}</span>
          <span>{axis(0)}</span>
        </div>
        <div
          ref={plot}
          role="img"
          aria-label={t("revenueChartLabel", { range: rangeName })}
          tabIndex={0}
          onPointerMove={(e) => pick(e.clientX)}
          onPointerDown={(e) => pick(e.clientX)}
          onPointerLeave={() => setHover(null)}
          onBlur={() => setHover(null)}
          onKeyDown={(e) => {
            if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
            e.preventDefault();
            setHover((cur) =>
              Math.min(
                n - 1,
                Math.max(0, (cur ?? n - 1) + (e.key === "ArrowLeft" ? -1 : 1)),
              ),
            );
          }}
          className="relative h-[200px] touch-pan-y rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <svg
            viewBox={`0 0 ${W} 200`}
            preserveAspectRatio="none"
            className="absolute inset-0 size-full overflow-visible"
            aria-hidden="true"
          >
            {[TOP, (TOP + BASE) / 2].map((gy) => (
              <line
                key={gy}
                x1="0"
                x2={W}
                y1={gy}
                y2={gy}
                className="stroke-border/60"
                vectorEffect="non-scaling-stroke"
              />
            ))}
            <line
              x1="0"
              x2={W}
              y1={BASE}
              y2={BASE}
              className="stroke-border"
              vectorEffect="non-scaling-stroke"
            />
            {area && (
              <path d={area} className="fill-brand" fillOpacity={0.16} />
            )}
            {prev && (
              <path
                d={prev}
                fill="none"
                className="stroke-muted-foreground/70"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                vectorEffect="non-scaling-stroke"
              />
            )}
            {main && (
              <path
                d={main}
                fill="none"
                className="stroke-brand"
                strokeWidth={2.5}
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            )}
            {partial && (
              <path
                d={partial}
                fill="none"
                className="stroke-brand"
                strokeWidth={2.5}
                strokeDasharray="3 5"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            )}
          </svg>
          {partialAt !== -1 && valueAt(partialAt) !== null && (
            <span
              aria-hidden="true"
              className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-brand bg-background"
              style={{
                left: `${pct(partialAt)}%`,
                top: y(valueAt(partialAt)!),
              }}
            />
          )}
          {h && hover !== null && (
            <>
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 w-px bg-foreground/25"
                style={{ left: `${pct(hover)}%` }}
              />
              {h.value !== null && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand ring-2 ring-background"
                  style={{ left: `${pct(hover)}%`, top: y(h.value) }}
                />
              )}
              <div
                aria-hidden="true"
                className={cn(
                  "pointer-events-none absolute top-0 z-10 w-max max-w-48 space-y-1 rounded-lg border bg-popover px-3 py-2 text-2xs shadow-md",
                  pct(hover) > 60
                    ? "-translate-x-[calc(100%+10px)]"
                    : "translate-x-2.5",
                )}
                style={{ left: `${pct(hover)}%` }}
              >
                <p className="font-semibold text-foreground">{label(hover)}</p>
                <p className="flex items-center justify-between gap-3 tabular-nums">
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <span className="h-[3px] w-2.5 rounded-full bg-brand" />
                    {t("thisPeriod")}
                  </span>
                  <b className="font-bold text-foreground">{full(h.value)}</b>
                </p>
                <p className="flex items-center justify-between gap-3 text-muted-foreground tabular-nums">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 border-t-2 border-dashed border-muted-foreground/70" />
                    {t("prevPeriod")}
                  </span>
                  {full(h.prev)}
                </p>
              </div>
            </>
          )}
        </div>
        <div
          aria-hidden="true"
          className="relative col-start-2 mt-2 h-4 text-3xs text-faint"
        >
          {ticks.map((i, k) => (
            <span
              key={i}
              className={cn(
                "absolute whitespace-nowrap",
                k === 0
                  ? "left-0"
                  : k === ticks.length - 1
                    ? "right-0"
                    : "-translate-x-1/2",
                // Phones: first, middle and last only.
                ticks.length === 5 && k % 2 === 1 && "max-sm:hidden",
              )}
              style={
                k === 0 || k === ticks.length - 1
                  ? undefined
                  : { left: `${pct(i)}%` }
              }
            >
              {w.points[i].partial ? (
                <>
                  <span className="sm:hidden">
                    {w.unit === "day" ? t("todayShort") : t("monthShort")}
                  </span>
                  <span className="max-sm:hidden">{label(i)}</span>
                </>
              ) : (
                label(i)
              )}
            </span>
          ))}
        </div>
      </div>

      <table className="sr-only">
        <caption>{t("revenueChartLabel", { range: rangeName })}</caption>
        <thead>
          <tr>
            <th scope="col">{t("tableDate")}</th>
            <th scope="col">{t("thisPeriod")}</th>
            <th scope="col">{t("prevPeriod")}</th>
          </tr>
        </thead>
        <tbody>
          {w.points.map((p, i) => (
            <tr key={p.key}>
              <th scope="row">{label(i)}</th>
              <td>{full(p.value)}</td>
              <td>{full(p.prev)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="flex items-start gap-2 border-t pt-3 text-2xs text-faint">
        <CheckIcon
          className="mt-px size-3.5 shrink-0 text-positive"
          strokeWidth={2.5}
          aria-hidden="true"
        />
        <span>
          {synced
            ? t("revenueFooter", { sources, time: synced })
            : t("revenueFooterNoTime", { sources })}
        </span>
      </p>
    </div>
  );
}
