"use client";

import { ChevronDownIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useId, useState } from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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
import { GrowthPill } from "./StartupBits";

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
    <label className="relative">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) =>
          onChange(
            options.find((o) => String(o.value) === e.target.value)!.value,
          )
        }
        className="h-7 appearance-none rounded-lg border bg-secondary pr-7 pl-2.5 text-caption font-medium"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDownIcon
        className="pointer-events-none absolute top-1/2 right-2 size-3 -translate-y-1/2 text-faint"
        aria-hidden="true"
      />
    </label>
  );
}

/**
 * Design.md §5 RevenueChartCard (spec 6.4 step 3): metric × period selects, period total +
 * growth, bars for daily flows / a straight-segment area for MRR, optional previous period and
 * trend overlay, and the selected metric's source stamp. Only metrics with verified data.
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
  // Trend is an overlay on the real values, never a replacement for them.
  const trendValues = smooth(cur);
  const data = w.points.map((p, i) => ({
    day: p.day,
    value: cur[i],
    previous: prev[i],
    trend: trendValues[i],
  }));

  const isMoney = metric !== "visitors";
  // Flows (money in per day, visitors per day) are bars, so a one-day payment stays on its day;
  // MRR is a level, drawn with straight segments (Design.md §5 RevenueChartCard).
  const bars = metric !== "mrr";
  // Round ticks in the unit people read: baht or dollars (values are USD cents), or visitors.
  const unit = isMoney
    ? currency === "thb" && thbPerUsd
      ? thbPerUsd / 100
      : 1 / 100
    : 1;
  const peak = Math.max(
    0,
    ...[...cur, ...(compare ? prev : []), ...(trend ? trendValues : [])].filter(
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
            <span
              className={cn(
                "bg-chart-1",
                bars ? "size-2 rounded-sm" : "h-0.5 w-4 rounded",
              )}
            />
            {periodLabel(period)}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-0 w-4 border-t-2 border-dashed border-chart-2" />
            {t("prevPeriod")}
          </span>
        </div>
      )}

      <div
        className="h-64 w-full"
        role="img"
        aria-label={`${metricLabel(metric)} · ${periodLabel(period)}: ${fmt(w.total, true)}`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--chart-1)"
                  stopOpacity={0.25}
                />
                <stop
                  offset="100%"
                  stopColor="var(--chart-1)"
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="day"
              tickFormatter={label}
              tickLine={false}
              axisLine={false}
              minTickGap={28}
              tick={{ fill: "var(--faint)", fontSize: 10 }}
            />
            <YAxis
              width={52}
              ticks={ticks}
              domain={[0, ticks[ticks.length - 1]]}
              interval={0}
              tickFormatter={(v: number) => fmt(v)}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--faint)", fontSize: 10 }}
            />
            <Tooltip
              cursor={
                bars
                  ? { fill: "var(--accent)", opacity: 0.5 }
                  : { stroke: "var(--faint)", strokeDasharray: "3 3" }
              }
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const row = payload[0].payload as (typeof data)[number];
                return (
                  <div className="rounded-md border bg-popover px-2.5 py-1.5 text-caption">
                    <p className="text-muted-foreground">
                      {period === 365
                        ? t("weekOf", { day: label(row.day) })
                        : label(row.day)}
                    </p>
                    <p className="font-bold tabular-nums">
                      {fmt(row.value, true)}
                    </p>
                    {compare && (
                      <p className="text-muted-foreground tabular-nums">
                        {t("prevPeriod")}: {fmt(row.previous, true)}
                      </p>
                    )}
                  </div>
                );
              }}
            />
            {bars ? (
              <Bar
                dataKey="value"
                fill="var(--chart-1)"
                radius={[3, 3, 0, 0]}
                maxBarSize={24}
                isAnimationActive={false}
              />
            ) : (
              <Area
                type="linear"
                dataKey="value"
                stroke="var(--chart-1)"
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                activeDot={{ r: 4, stroke: "var(--card)", strokeWidth: 2 }}
                connectNulls
                isAnimationActive={false}
              />
            )}
            {compare && (
              <Line
                type="linear"
                dataKey="previous"
                stroke="var(--chart-2)"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            )}
            {trend && (
              <Line
                type="monotone"
                dataKey="trend"
                stroke="var(--muted-foreground)"
                strokeWidth={2}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

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
