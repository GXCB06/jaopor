import {
  CodeIcon,
  ExternalLinkIcon,
  GlobeIcon,
  HandHelpingIcon,
  MessageCircleIcon,
  MessageSquareIcon,
  SmartphoneIcon,
  type LucideIcon,
} from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import type { StartupRow } from "@/lib/data/startups";
import { growthPct } from "@/lib/format";
import { Link } from "@/i18n/navigation";
import { linkPlatform, projectLinks, type LinkKind } from "@/lib/links";
import { lookingForActions } from "@/lib/looking-for";
import { SOURCE_KIND, SOURCE_NAME, isSource } from "@/lib/sources/catalog";
import { StatCard } from "../ProfileBlocks";
import { GrowthValue } from "../StartupBits";
import { Card } from "../core/Card";
import { cn } from "@/lib/utils";
import { EmptyOwnerCard, OwnerOnly, VisitorOnly } from "./Owner";

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
            {/* A1.2: a Facebook / YouTube page is named as such, never "website". */}
            {kind === "website" && linkPlatform(url)
              ? t(`platforms.${linkPlatform(url)!}`)
              : t(kind)}
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
  const founder = startup.owner;
  const founderName = founder?.display_name ?? founder?.handle ?? "";
  // UX master audit A1.1: the asks are labels; each action is a real button. Co-founder (and
  // investor / buyer) open a contact request to the founder, never the product's website.
  const actions = lookingForActions(startup.looking_for, {
    founderHandle: founder?.handle ?? null,
    productUrl: projectLinks(startup)[0]?.url ?? null,
  });
  const contact = actions.find((a) => a.kind === "contact");
  const tryIt = actions.find((a) => a.kind === "try");
  return (
    <div className="space-y-3 rounded-xl border border-warning/30 bg-warning/5 p-3 text-xs">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <HandHelpingIcon
          className="size-4 shrink-0 text-warning"
          aria-hidden="true"
        />
        <span className="font-semibold">{t("title")}:</span>
        <span className="text-foreground/90">
          {startup.looking_for.map((x) => t(x as "users")).join(" · ")}
        </span>
      </p>
      {(contact || tryIt) && (
        <div className="flex flex-wrap gap-2">
          {contact?.kind === "contact" && (
            <VisitorOnly>
              <Link
                href={contact.href}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-caption font-semibold text-primary-foreground hover:opacity-90"
              >
                <MessageSquareIcon className="size-3.5" aria-hidden="true" />
                {contact.topic === "cofounder"
                  ? t("contactCofounder")
                  : t("contactFounder")}{" "}
                ›
              </Link>
            </VisitorOnly>
          )}
          {tryIt && (
            <a
              href={tryIt.href}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className={cn(
                "inline-flex min-h-9 items-center rounded-md px-3 py-1.5 text-caption font-semibold",
                contact
                  ? "border bg-card hover:bg-accent"
                  : "bg-primary text-primary-foreground hover:opacity-90",
              )}
            >
              {t("tryIt")} ›
            </a>
          )}
        </div>
      )}
      {contact && founderName && (
        <>
          <VisitorOnly>
            <p className="text-2xs text-muted-foreground">
              {t("contactHint", { name: founderName })}
            </p>
          </VisitorOnly>
          <OwnerOnly>
            <p className="text-2xs text-muted-foreground">{t("ownerHint")}</p>
          </OwnerOnly>
        </>
      )}
    </div>
  );
}

export async function TractionTiles({ startup }: { startup: StartupRow }) {
  const [t, format] = await Promise.all([
    getTranslations("Profile"),
    getFormatter(),
  ]);
  // Demo projects (sample data) never claim a verification source.
  const via = (source: string | null) =>
    startup.is_demo
      ? t("sampleShort")
      : source === "jaopor"
        ? t("viaJaopor")
        : source === "cloudflare"
          ? t("viaCloudflare")
          : source && isSource(source)
            ? // Visitor counts are counted, not verified (Design.md §3 Verified vs counted).
              SOURCE_KIND[source] === "traffic"
              ? t("countedBy", { source: SOURCE_NAME[source] })
              : t("via", { source: SOURCE_NAME[source] })
            : null;
  const n = (v: number) => format.number(v);

  const commits = startup.build_commits;
  const claudePct =
    commits && startup.build_ai_commits !== null
      ? Math.round((startup.build_ai_commits / commits) * 100)
      : null;

  // Spec 2.4: a metric with no data is hidden for visitors and becomes a dashed prompt for the owner.
  const tiles: {
    key: string;
    anchor: string;
    label: string;
    card: React.ReactNode | null;
    span?: string;
  }[] = [
    {
      key: "visitors",
      anchor: "verify-traffic",
      label: t("visitors30d"),
      card:
        startup.visitors_30d !== null ? (
          <StatCard
            label={t("visitors30d")}
            value={n(startup.visitors_30d)}
            caption={
              <span className="whitespace-normal">
                <GrowthValue
                  pct={growthPct(
                    startup.visitors_30d,
                    startup.visitors_prev_30d,
                  )}
                />{" "}
                {via(startup.traffic_provider)}
              </span>
            }
          />
        ) : null,
    },
    {
      key: "users",
      anchor: "verify-revenue",
      label: t("activeUsers"),
      card:
        startup.active_users !== null ? (
          <StatCard
            label={t("activeUsers")}
            value={n(startup.active_users)}
            caption={via("revenuecat")}
          />
        ) : null,
    },
    {
      key: "build",
      anchor: "verify-build",
      label: t("buildProof"),
      span: "col-span-2 md:col-span-1",
      card:
        commits !== null ? (
          <StatCard
            label={t("buildProof")}
            value={t("commits", { count: commits })}
            caption={
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
            }
          />
        ) : null,
    },
  ];

  const section = (
    <section className="space-y-3">
      <h2 className="text-sm font-bold">{t("traction")}</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-[repeat(auto-fit,minmax(12rem,1fr))]">
        {tiles.map((x) =>
          x.card ? (
            <div key={x.key} className={x.span}>
              {x.card}
            </div>
          ) : (
            <EmptyOwnerCard
              key={x.key}
              field={x.anchor}
              label={x.label}
              className={x.span}
            />
          ),
        )}
      </div>
      {startup.build_story ? (
        <Card className="space-y-2 p-4">
          <p className="text-2xs font-bold tracking-wider text-faint uppercase">
            {t("buildStory")}
          </p>
          <p className="font-prose text-xs leading-relaxed whitespace-pre-line">
            “{startup.build_story}”
          </p>
        </Card>
      ) : (
        <EmptyOwnerCard field="build_story" label={t("buildStory")} />
      )}
    </section>
  );
  const hasData = tiles.some((x) => x.card) || Boolean(startup.build_story);
  return hasData ? section : <OwnerOnly>{section}</OwnerOnly>;
}
