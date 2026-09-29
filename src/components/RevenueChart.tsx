"use client";

import { ChevronDownIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useId, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { growthPct, moneyCompact, moneyFull } from "@/lib/format";
import { cn } from "@/lib/utils";
import { GrowthPill } from "./StartupBits";

type Point = { day: string; revenueCents: number };

export const CHART_RANGES = [7, 30, 60] as const;
type Range = (typeof CHART_RANGES)[number];

const sum = (ps: Point[]) => ps.reduce((a, p) => a + p.revenueCents, 0);

/** 7-day trailing average (the "Trend view" switch). */
function smooth(values: number[]): number[] {
  return values.map((_, i) => {
    const w = values.slice(Math.max(0, i - 6), i + 1);
    return Math.round(w.reduce((a, v) => a + v, 0) / w.length);
  });
}

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

/**
 * Design.md §5 RevenueChartCard: headline total + growth pill, range dropdown, area chart
 * (--chart-1), optional dashed previous period (--chart-2) and 7-day trend. `series` is the
 * zero-filled daily revenue for the last 2 × 60 days, oldest first.
 */
export function RevenueChart({ series }: { series: Point[] }) {
  const t = useTranslations("Profile");
  const format = useFormatter();
  const [range, setRange] = useState<Range>(30);
  const [compare, setCompare] = useState(false);
  const [trend, setTrend] = useState(false);
  const gradientId = useId().replace(/:/g, "");

  const current = series.slice(-range);
  const previous = series.slice(-2 * range, -range);
  const total = sum(current);
  const growth = growthPct(total, sum(previous));

  const cur = current.map((p) => p.revenueCents);
  const prev = previous.map((p) => p.revenueCents);
  const curValues = trend ? smooth(cur) : cur;
  const prevValues = trend ? smooth(prev) : prev;
  const data = current.map((p, i) => ({
    day: p.day,
    revenue: curValues[i],
    previous: prevValues[i] ?? 0,
  }));
  const label = (day: string) =>
    format.dateTime(new Date(`${day}T00:00:00Z`), {
      day: "numeric",
      month: "short",
    });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <p className="text-3xl font-bold tracking-tight tabular-nums">
            {moneyFull(total)}
          </p>
          <GrowthPill pct={growth} suffix={t("vsPrevShort")} />
        </div>
        <label className="relative">
          <span className="sr-only">{t("range")}</span>
          <select
            value={range}
            onChange={(e) => setRange(Number(e.target.value) as Range)}
            className="h-7 appearance-none rounded-lg border bg-secondary pr-7 pl-2.5 text-caption font-medium"
          >
            {CHART_RANGES.map((r) => (
              <option key={r} value={r}>
                {t("lastDays", { days: r })}
              </option>
            ))}
          </select>
          <ChevronDownIcon
            className="pointer-events-none absolute top-1/2 right-2 size-3 -translate-y-1/2 text-faint"
            aria-hidden="true"
          />
        </label>
      </div>

      {compare && (
        <div className="flex gap-4 text-2xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded bg-chart-1" />
            {t("lastDays", { days: range })}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-0 w-4 border-t-2 border-dashed border-chart-2" />
            {t("prevPeriod")}
          </span>
        </div>
      )}

      <div className="h-64 w-full" role="img" aria-label={t("chartTitle")}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
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
              width={44}
              tickFormatter={(v: number) => moneyCompact(v)}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--faint)", fontSize: 10 }}
            />
            <Tooltip
              cursor={{ stroke: "var(--faint)", strokeDasharray: "3 3" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const row = payload[0].payload as (typeof data)[number];
                return (
                  <div className="rounded-md border bg-popover px-2.5 py-1.5 text-caption">
                    <p className="text-muted-foreground">{label(row.day)}</p>
                    <p className="font-bold tabular-nums">
                      {moneyFull(row.revenue)}
                    </p>
                    {compare && (
                      <p className="text-muted-foreground tabular-nums">
                        {t("prevPeriod")}: {moneyFull(row.previous)}
                      </p>
                    )}
                  </div>
                );
              }}
            />
            {compare && (
              <Line
                type="monotone"
                dataKey="previous"
                stroke="var(--chart-2)"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
                isAnimationActive={false}
              />
            )}
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="var(--chart-1)"
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              activeDot={{ r: 4, stroke: "var(--card)", strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-2">
        <Switch checked={compare} onChange={setCompare} label={t("compare")} />
        <Switch checked={trend} onChange={setTrend} label={t("trend")} />
      </div>
    </div>
  );
}
