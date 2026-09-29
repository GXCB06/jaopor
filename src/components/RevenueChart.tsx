"use client";

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
import { moneyCompact, moneyFull } from "@/lib/format";

type Point = { day: string; revenueCents: number };

/**
 * Design.md §5 RevenueChart: 30-day revenue area (--chart-2, 2px), optional dashed previous
 * period (--chart-1). Crosshair + tooltip on hover; text in text tokens, never series colours.
 */
export function RevenueChart({
  current,
  previous,
}: {
  current: Point[];
  previous: Point[];
}) {
  const t = useTranslations("Profile");
  const format = useFormatter();
  const [compare, setCompare] = useState(false);
  const gradientId = useId().replace(/:/g, "");

  const data = current.map((p, i) => ({
    day: p.day,
    revenue: p.revenueCents,
    previous: previous[i]?.revenueCents ?? 0,
  }));
  const label = (day: string) =>
    format.dateTime(new Date(`${day}T00:00:00Z`), {
      day: "numeric",
      month: "short",
    });

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">{t("chartTitle")}</h2>
        <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={compare}
            onChange={(e) => setCompare(e.target.checked)}
            className="accent-(--chart-1)"
          />
          {t("compare")}
        </label>
      </div>

      {compare && (
        <div className="mb-2 flex gap-4 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded bg-chart-2" /> {t("revenue30d")}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-0 w-4 border-t-2 border-dashed border-chart-1" />{" "}
            {t("vsPrev")}
          </span>
        </div>
      )}

      <div className="h-48 w-full" role="img" aria-label={t("chartTitle")}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--chart-2)"
                  stopOpacity={0.25}
                />
                <stop
                  offset="100%"
                  stopColor="var(--chart-2)"
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
              minTickGap={24}
              tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
            />
            <YAxis
              width={44}
              tickFormatter={(v: number) => moneyCompact(v)}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
            />
            <Tooltip
              cursor={{
                stroke: "var(--muted-foreground)",
                strokeDasharray: "3 3",
              }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const row = payload[0].payload as (typeof data)[number];
                return (
                  <div className="rounded-md border bg-popover px-2.5 py-1.5 text-xs">
                    <p className="text-muted-foreground">{label(row.day)}</p>
                    <p className="font-bold tabular-nums">
                      {moneyFull(row.revenue)}
                    </p>
                    {compare && (
                      <p className="text-muted-foreground tabular-nums">
                        {t("vsPrev")}: {moneyFull(row.previous)}
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
                stroke="var(--chart-1)"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
                isAnimationActive={false}
              />
            )}
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="var(--chart-2)"
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              activeDot={{ r: 4, stroke: "var(--background)", strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
