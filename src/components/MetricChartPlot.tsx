"use client";

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

// The Recharts plot of MetricChart, split out so the library loads after the page is interactive
// (MetricChart imports it with next/dynamic, ssr: false; Design.md §7 Loading).

type Row = { day: string; value: number | null; previous: number | null };

export default function MetricChartPlot({
  data,
  ticks,
  gradientId,
  compare,
  fmt,
  label,
  tipDay,
  prevLabel,
}: {
  data: Row[];
  ticks: number[];
  gradientId: string;
  compare: boolean;
  fmt: (v: number | null, full?: boolean) => string;
  label: (day: string) => string;
  /** The tooltip's date line (a week label on the 1-year range). */
  tipDay: (day: string) => string;
  prevLabel: string;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.25} />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis
          dataKey="day"
          tickFormatter={label}
          tickLine={false}
          axisLine={false}
          minTickGap={28}
          tick={{ fill: "var(--faint)", fontSize: 12 }}
        />
        <YAxis
          width={52}
          ticks={ticks}
          domain={[0, ticks[ticks.length - 1]]}
          interval={0}
          tickFormatter={(v: number) => fmt(v)}
          tickLine={false}
          axisLine={false}
          tick={{ fill: "var(--faint)", fontSize: 12 }}
        />
        <Tooltip
          cursor={{ stroke: "var(--faint)", strokeDasharray: "3 3" }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const row = payload[0].payload as (typeof data)[number];
            return (
              <div className="rounded-md border bg-popover px-2.5 py-1.5 text-caption">
                <p className="text-muted-foreground">{tipDay(row.day)}</p>
                <p className="font-bold tabular-nums">{fmt(row.value, true)}</p>
                {compare && (
                  <p className="text-muted-foreground tabular-nums">
                    {prevLabel}: {fmt(row.previous, true)}
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
            connectNulls
            isAnimationActive={false}
          />
        )}
        <Area
          type="monotone"
          dataKey="value"
          stroke="var(--chart-1)"
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          activeDot={{ r: 4, stroke: "var(--card)", strokeWidth: 2 }}
          connectNulls
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
