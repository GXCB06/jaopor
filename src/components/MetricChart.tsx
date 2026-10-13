"use client";

import { ChoiceSelect } from "@/components/core/ChoiceSelect";
import { useFormatter, useTranslations } from "next-intl";
import { useId, useState } from "react";
import dynamic from "next/dynamic";
import {
  CHART_METRICS,
  CHART_PERIODS,
  chartWindow,
  niceTicks,
  smooth,
  type ChartMetric,
  type ChartPeriod,
} from "@/lib/chart-window";
import { useCurrency } from "@/lib/currency";
import type { ChartSeries } from "@/lib/data/startups";
import { formatCompact, money } from "@/lib/format";
import { cn } from "@/lib/utils";
import { InView } from "./core/InView";
import { GrowthPill } from "./StartupBits";

// Design.md §7 Loading (owner 2026-10-13, "หน่วง"): Recharts (~390 KB) is the heaviest code on the
// project page, so only the plot loads after the page is interactive; the total, the controls and
// the stamp still render on the server. The placeholder keeps the h-64 box, so nothing shifts.
const Plot = dynamic(() => import("./MetricChartPlot"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full animate-pulse rounded-md bg-muted/40" />
  ),
});

function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-caption text-muted-foreground select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-4 w-7 shrink-0 rounded-full border transition-colors",
          checked ? "border-chart-1 bg-chart-1" : "bg-secondary",
        )}
      >
        <span
          className={cn(
            "absolute top-1/2 size-3 -translate-y-1/2 rounded-full bg-foreground transition-all",
            checked ? "left-3.5" : "left-0.5",
          )}
        />
      </button>
      {label}
    </label>
  );
}

function CompactSelect<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <ChoiceSelect
      variant="chip"
      aria-label={label}
      value={String(value)}
      onValueChange={(v) =>
        onChange(options.find((o) => String(o.value) === v)!.value)
      }
      options={options.map((o) => ({ value: String(o.value), label: o.label }))}
      className="text-caption font-medium"
    />
  );
}

/**
 * Design.md §5 RevenueChartCard (spec 6.4 step 3): metric × period selects, period total +
 * growth, area chart with optional previous period and trend, and the selected metric's source
 * stamp. Only metrics with verified data are offered.
 */
export function MetricChart({
  series,
  thbPerUsd,
  stamps,
}: {
  series: ChartSeries;
  thbPerUsd: number | null;
  /** Server-rendered "verified via … · updated …" line per metric. */
  stamps: Partial<Record<ChartMetric, React.ReactNode>>;
}) {
  const t = useTranslations("Profile");
  const format = useFormatter();
  const currency = useCurrency();
  const metrics = CHART_METRICS.filter((m) => series[m] !== null);
  const [metric, setMetric] = useState<ChartMetric>(metrics[0] ?? "revenue");
  const [period, setPeriod] = useState<ChartPeriod>(30);
  const [compare, setCompare] = useState(false);
  const [trend, setTrend] = useState(false);
  const gradientId = useId().replace(/:/g, "");

  const values = series[metric];
  if (!values) return null;
  const w = chartWindow(values, series.start, metric, period);
  const cur = w.points.map((p) => p.value);
  const prev = w.points.map((p) => p.previous);
  const curValues = trend ? smooth(cur) : cur;
  const prevValues = trend ? smooth(prev) : prev;
  const data = w.points.map((p, i) => ({
    day: p.day,
    value: curValues[i],
    previous: prevValues[i],
  }));

  const isMoney = metric !== "visitors";
  // Round ticks in the unit people read: baht or dollars (values are USD cents), or visitors,
  // so the axis reads ฿0 / 250 / 500 rather than converted dollar steps like ฿252 / ฿504.
  const unit = isMoney
    ? currency === "thb" && thbPerUsd
      ? thbPerUsd / 100
      : 1 / 100
    : 1;
  const peak = Math.max(
    0,
    ...[...curValues, ...(compare ? prevValues : [])].filter(
      (v): v is number => v !== null,
    ),
  );
  const ticks = niceTicks(peak * unit, { integer: !isMoney }).map(
    (v) => v / unit,
  );
  const fmt = (v: number | null, full = false) =>
    v === null
      ? "—"
      : isMoney
        ? money(v, { currency, thbPerUsd, full })
        : full
          ? format.number(v)
          : formatCompact(v);
  const label = (day: string) =>
    format.dateTime(new Date(`${day}T00:00:00Z`), {
      day: "numeric",
      month: "short",
      ...(period === 365 ? { year: "2-digit" } : {}),
    });
  const periodLabel = (p: ChartPeriod) =>
    p === 365 ? t("period365") : t("periodDays", { days: p });
  const metricLabel = (m: ChartMetric) =>
    m === "revenue"
      ? t("metricRevenue")
      : m === "mrr"
        ? t("mrr")
        : t("metricVisitors");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <p className="text-3xl font-bold tracking-tight tabular-nums">
            {fmt(w.total, true)}
          </p>
          <GrowthPill pct={w.growth} suffix={t("vsPrevShort")} />
        </div>
        <div className="flex gap-2">
          {metrics.length > 1 && (
            <CompactSelect
              label={t("chartMetric")}
              value={metric}
              onChange={setMetric}
              options={metrics.map((m) => ({
                value: m,
                label: metricLabel(m),
              }))}
            />
          )}
          <CompactSelect
            label={t("range")}
            value={period}
            onChange={setPeriod}
            options={CHART_PERIODS.map((p) => ({
              value: p,
              label: periodLabel(p),
            }))}
          />
        </div>
      </div>

      {compare && (
        <div className="flex gap-4 text-2xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded bg-chart-1" />
            {periodLabel(period)}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-0 w-4 border-t-2 border-dashed border-chart-2" />
            {t("prevPeriod")}
          </span>
        </div>
      )}

      {/* Design.md §7 Motion: the series draws in once, on first view. */}
      <InView>
        <div
          className="h-64 w-full"
          role="img"
          aria-label={`${metricLabel(metric)} · ${periodLabel(period)}: ${fmt(w.total, true)}`}
        >
          <Plot
            data={data}
            ticks={ticks}
            gradientId={gradientId}
            compare={compare}
            fmt={fmt}
            label={label}
            tipDay={(day) =>
              period === 365 ? t("weekOf", { day: label(day) }) : label(day)
            }
            prevLabel={t("prevPeriod")}
          />
        </div>
      </InView>

      <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-3">
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          <Switch
            checked={compare}
            onChange={setCompare}
            label={t("compare")}
          />
          <Switch checked={trend} onChange={setTrend} label={t("trend")} />
        </div>
        {stamps[metric]}
      </div>
    </div>
  );
}
