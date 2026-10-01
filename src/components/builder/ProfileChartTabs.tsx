"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { BuilderRevenue } from "@/lib/data/builder";
import { REVENUE_RANGES, type RevenueRange } from "@/lib/profile-revenue";
import { cn } from "@/lib/utils";
import { ProfileRevenueChart } from "./ProfileRevenueChart";
import { toolbarButton } from "./toolbar";

/**
 * Design.md §6 Builder profile v2: one card with tabs "รายได้รวม | กิจกรรมการสร้าง"; the toolbar
 * holds the range buttons (revenue) or the year buttons (activity). Without verified revenue,
 * visitors get the activity panel alone and the owner gets `revenueEmpty` in the revenue tab.
 */
export function ProfileChartTabs({
  revenue,
  revenueEmpty,
  thbPerUsd,
  sources,
  activity,
  activityActions,
}: {
  revenue: BuilderRevenue | null;
  revenueEmpty: React.ReactNode | null;
  thbPerUsd: number | null;
  sources: string;
  activity: React.ReactNode;
  activityActions: React.ReactNode;
}) {
  const t = useTranslations("Builder");
  const hasRevenueTab = revenue !== null || revenueEmpty !== null;
  const [tab, setTab] = useState<"revenue" | "activity">(
    hasRevenueTab ? "revenue" : "activity",
  );
  const [range, setRange] = useState<RevenueRange>("30d");

  const btn = (id: "revenue" | "activity", label: string) => (
    <button
      type="button"
      role="tab"
      id={`profile-tab-${id}`}
      aria-selected={tab === id}
      aria-controls={`profile-panel-${id}`}
      onClick={() => setTab(id)}
      className={cn(
        "h-9 rounded-lg border px-3.5 text-caption font-bold transition-colors",
        tab === id
          ? "border-border-strong bg-secondary text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        {hasRevenueTab && (
          <div
            role="tablist"
            aria-label={t("tabsLabel")}
            className="inline-flex gap-1 rounded-xl border bg-background p-1"
          >
            {btn("revenue", t("tabRevenue"))}
            {btn("activity", t("tabActivity"))}
          </div>
        )}
        <span className="flex-1" />
        {tab === "revenue" && revenue ? (
          <div role="group" aria-label={t("rangeLabel")} className="flex gap-1">
            {REVENUE_RANGES.map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={range === r}
                onClick={() => setRange(r)}
                className={toolbarButton(range === r)}
              >
                {t(`range.${r}`)}
              </button>
            ))}
          </div>
        ) : tab === "activity" ? (
          activityActions
        ) : null}
      </div>
      {hasRevenueTab && (
        <div
          role="tabpanel"
          id="profile-panel-revenue"
          aria-labelledby="profile-tab-revenue"
          hidden={tab !== "revenue"}
        >
          {revenue ? (
            <ProfileRevenueChart
              data={revenue}
              range={range}
              thbPerUsd={thbPerUsd}
              sources={sources}
            />
          ) : (
            revenueEmpty
          )}
        </div>
      )}
      <div
        role={hasRevenueTab ? "tabpanel" : undefined}
        id="profile-panel-activity"
        aria-labelledby={hasRevenueTab ? "profile-tab-activity" : undefined}
        hidden={tab !== "activity"}
      >
        {activity}
      </div>
    </div>
  );
}
