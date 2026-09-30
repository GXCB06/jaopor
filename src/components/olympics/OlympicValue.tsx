import { Money } from "@/components/StartupBits";
import { isMoneyMetric, type OlympicMetric } from "@/lib/olympics";

const compact = (n: number) =>
  new Intl.NumberFormat("en", { notation: "compact" }).format(n);

/** An Olympics number: money in the visitor's ฿/$ choice, counts compact (12.4k). */
export function OlympicValue({
  value,
  metric,
  thbPerUsd,
}: {
  value: number;
  metric: OlympicMetric;
  thbPerUsd: number | null;
}) {
  return isMoneyMetric(metric) ? (
    <Money cents={value} thbPerUsd={thbPerUsd} />
  ) : (
    <>{compact(value)}</>
  );
}
