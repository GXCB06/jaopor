"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Design.md §6 Builder profile v2: one card with tabs "รายได้รวม | กิจกรรมการสร้าง". Both panels
 * are rendered on the server; without verified revenue only the activity panel shows (no tabs).
 */
export function ProfileChartTabs({
  revenue,
  activity,
  labels,
}: {
  revenue: React.ReactNode | null;
  activity: React.ReactNode;
  labels: { revenue: string; activity: string; group: string };
}) {
  const [tab, setTab] = useState<"revenue" | "activity">(
    revenue ? "revenue" : "activity",
  );
  if (!revenue) return <>{activity}</>;
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
    <div className="space-y-4">
      <div
        role="tablist"
        aria-label={labels.group}
        className="inline-flex gap-1 rounded-xl border bg-background p-1"
      >
        {btn("revenue", labels.revenue)}
        {btn("activity", labels.activity)}
      </div>
      <div
        role="tabpanel"
        id="profile-panel-revenue"
        aria-labelledby="profile-tab-revenue"
        hidden={tab !== "revenue"}
      >
        {revenue}
      </div>
      <div
        role="tabpanel"
        id="profile-panel-activity"
        aria-labelledby="profile-tab-activity"
        hidden={tab !== "activity"}
      >
        {activity}
      </div>
    </div>
  );
}
