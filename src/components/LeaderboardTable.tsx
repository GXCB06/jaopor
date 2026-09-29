import Image from "next/image";
import { useTranslations } from "next-intl";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Link } from "@/i18n/navigation";
import type { StartupRow } from "@/lib/data/startups";
import { growthPct, moneyCompact } from "@/lib/format";
import { logoUrl } from "@/lib/supabase/public";
import { GrowthValue, StartupLogo } from "./StartupBits";

const MEDALS = ["🥇", "🥈", "🥉"];

/** Design.md §5 LeaderboardTable. Founder column hidden below `sm` (§8). */
export function LeaderboardTable({ rows }: { rows: StartupRow[] }) {
  const t = useTranslations("Leaderboard");
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">{t("rank")}</TableHead>
          <TableHead>{t("startup")}</TableHead>
          <TableHead className="hidden sm:table-cell">{t("founder")}</TableHead>
          <TableHead className="text-right">{t("mrr")}</TableHead>
          <TableHead className="text-right">{t("growth")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((s, i) => (
          <TableRow key={s.id} className="group">
            <TableCell className="tabular-nums">{MEDALS[i] ?? i + 1}</TableCell>
            <TableCell className="max-w-0">
              <Link
                href={`/startup/${s.slug}`}
                className="flex min-w-0 items-center gap-2"
              >
                <StartupLogo
                  name={s.name}
                  src={logoUrl(s.logo_path)}
                  size={24}
                />
                <span className="truncate font-medium group-hover:underline">
                  {s.name}
                </span>
              </Link>
            </TableCell>
            <TableCell className="hidden sm:table-cell">
              {s.owner && (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {s.owner.avatar_url && (
                    <Image
                      src={s.owner.avatar_url}
                      alt=""
                      width={20}
                      height={20}
                      className="rounded-full"
                    />
                  )}
                  <span className="truncate">
                    {s.owner.x_handle
                      ? `@${s.owner.x_handle}`
                      : (s.owner.display_name ?? "")}
                  </span>
                </span>
              )}
            </TableCell>
            <TableCell className="text-right font-bold tabular-nums">
              {moneyCompact(s.mrr_cents)}
            </TableCell>
            <TableCell className="text-right text-xs">
              <GrowthValue
                pct={growthPct(s.revenue_30d_cents, s.revenue_prev_30d_cents)}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
