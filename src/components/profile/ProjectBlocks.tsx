import {
  CodeIcon,
  ExternalLinkIcon,
  GlobeIcon,
  HandHelpingIcon,
  MessageCircleIcon,
  SmartphoneIcon,
  type LucideIcon,
} from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import type { StartupRow } from "@/lib/data/startups";
import { growthPct } from "@/lib/format";
import { projectLinks, type LinkKind } from "@/lib/links";
import { SOURCE_NAME, isSource } from "@/lib/sources/catalog";
import { StatTile } from "../ProfileBlocks";
import { Chip, GrowthValue } from "../StartupBits";
import { EmptyValue } from "./Owner";

// Design.md §5 ProjectLinks · LookingForBanner · TractionTiles + BuildProof.

const LINK_ICON: Record<LinkKind, LucideIcon> = {
  website: GlobeIcon,
  app_store: SmartphoneIcon,
  play_store: SmartphoneIcon,
  line: MessageCircleIcon,
  github: CodeIcon,
};

/** Secondary project links (the first one is the header's primary "Visit"). */
export async function ProjectLinks({
  startup,
  skipFirst = false,
}: {
  startup: StartupRow;
  skipFirst?: boolean;
}) {
  const t = await getTranslations("Links");
  const links = projectLinks(startup).slice(skipFirst ? 1 : 0);
  if (!links.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {links.map(({ kind, url }) => {
        const Icon = LINK_ICON[kind];
        return (
          <a
            key={kind}
            href={url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="inline-flex h-7 items-center gap-1.5 rounded-md border bg-card px-2.5 text-caption font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Icon className="size-3.5" aria-hidden="true" />
            {t(kind)}
            <ExternalLinkIcon className="size-3" aria-hidden="true" />
          </a>
        );
      })}
    </div>
  );
}

export async function LookingForBanner({ startup }: { startup: StartupRow }) {
  if (!startup.looking_for.length) return null;
  const t = await getTranslations("LookingFor");
  const primary = projectLinks(startup)[0];
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-warning/30 bg-warning/5 p-3 text-xs">
      <HandHelpingIcon className="size-4 text-warning" aria-hidden="true" />
      <span className="font-semibold">{t("title")}:</span>
      {startup.looking_for.map((x) => (
        <Chip key={x}>{t(x as "users")}</Chip>
      ))}
      {primary &&
        startup.looking_for.some((x) => x !== "buyer" && x !== "investor") && (
          <a
            href={primary.url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="ml-auto inline-flex h-7 items-center rounded-md bg-primary px-3 text-caption font-semibold text-primary-foreground hover:opacity-90"
          >
            {t("tryIt")} ›
          </a>
        )}
    </div>
  );
}

export async function TractionTiles({ startup }: { startup: StartupRow }) {
  const [t, common, format] = await Promise.all([
    getTranslations("Profile"),
    getTranslations("Common"),
    getFormatter(),
  ]);
  const via = (source: string | null) =>
    source && isSource(source)
      ? t("via", { source: SOURCE_NAME[source] })
      : null;
  const notVerified = (anchor: string) => (
    <EmptyValue field={anchor} visitorText={common("notVerified")} />
  );
  const n = (v: number) => format.number(v);

  const commits = startup.build_commits;
  const claudePct =
    commits && startup.build_ai_commits !== null
      ? Math.round((startup.build_ai_commits / commits) * 100)
      : null;
  const revenueCat = startup.verified_provider === "revenuecat";

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-bold">{t("traction")}</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatTile
          label={t("visitors30d")}
          value={startup.visitors_30d !== null ? n(startup.visitors_30d) : "–"}
          caption={
            startup.visitors_30d !== null ? (
              <span className="whitespace-normal">
                <GrowthValue
                  pct={growthPct(
                    startup.visitors_30d,
                    startup.visitors_prev_30d,
                  )}
                />{" "}
                {via(startup.traffic_provider)}
              </span>
            ) : (
              notVerified("verify-traffic")
            )
          }
        />
        <StatTile
          label={t("activeUsers")}
          value={startup.active_users !== null ? n(startup.active_users) : "–"}
          caption={
            startup.active_users !== null
              ? via("revenuecat")
              : revenueCat
                ? via("revenuecat")
                : notVerified("verify-revenue")
          }
        />
        <div className="col-span-2 md:col-span-1">
          <StatTile
            label={t("buildProof")}
            value={commits !== null ? t("commits", { count: commits }) : "–"}
            caption={
              commits !== null ? (
                <span className="whitespace-normal">
                  {[
                    claudePct !== null && claudePct > 0
                      ? t("claudeShare", { pct: claudePct })
                      : null,
                    startup.build_first_commit_at
                      ? t("firstCommit", {
                          date: format.dateTime(
                            new Date(startup.build_first_commit_at),
                            { dateStyle: "medium" },
                          ),
                        })
                      : null,
                    startup.build_stars
                      ? t("stars", { count: n(startup.build_stars) })
                      : null,
                    via("github"),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              ) : (
                notVerified("verify-build")
              )
            }
          />
        </div>
      </div>
      <div className="space-y-2 rounded-xl border bg-card p-4">
        <p className="text-2xs font-bold tracking-wider text-faint uppercase">
          {t("buildStory")}
        </p>
        {startup.build_story ? (
          <p className="text-xs leading-relaxed whitespace-pre-line">
            “{startup.build_story}”
          </p>
        ) : (
          <EmptyValue field="build_story" />
        )}
      </div>
    </section>
  );
}
