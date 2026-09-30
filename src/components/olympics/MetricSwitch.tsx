"use client";

import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { SegmentedControl } from "@/components/core/SegmentedControl";
import { useRouter } from "@/i18n/navigation";
import {
  DEFAULT_METRIC,
  OLYMPIC_METRICS,
  type OlympicMetric,
} from "@/lib/olympics";
import { cn } from "@/lib/utils";

/** Spec 6.7 metric SegmentedControl; the choice lives in `?metric=` (the region stays as is). */
export function MetricSwitch({
  metric,
  region,
}: {
  metric: OlympicMetric;
  region: string | null;
}) {
  const t = useTranslations("Olympics");
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <SegmentedControl
      label={t("metric")}
      value={metric}
      className={cn(
        "w-full sm:w-auto",
        pending && "opacity-70 transition-opacity",
      )}
      options={OLYMPIC_METRICS.map((m) => ({
        value: m,
        label: t(`metrics.${m}`),
      }))}
      onChange={(m) =>
        start(() =>
          router.replace(
            {
              pathname: "/olympics",
              query: {
                ...(m !== DEFAULT_METRIC && { metric: m }),
                ...(region && { region }),
              },
            },
            { scroll: false },
          ),
        )
      }
    />
  );
}
