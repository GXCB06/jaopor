import {
  BadgeCheckIcon,
  ChartColumnIcon,
  Code2Icon,
  DollarSignIcon,
  LandmarkIcon,
  LightbulbIcon,
  MegaphoneIcon,
  ShieldCheckIcon,
  SparklesIcon,
  TagIcon,
  UserIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getCategory } from "@/lib/config/categories";
import {
  aiToolChip,
  categoryName,
  channelChip,
  stackGroups,
  type GlyphRef,
} from "@/lib/config/display";
import { formatPricing } from "@/lib/pricing";
import { isSyncStale, type StartupRow } from "@/lib/data/startups";
import { SOURCE_NAME, isSource } from "@/lib/sources/catalog";
import { cn } from "@/lib/utils";
import { PersonPhoto } from "./PersonPhoto";
import { Card } from "./core/Card";
import { InsightCard } from "./core/InsightCard";
import { LogoChip } from "./core/LogoChip";
import { EmptyOwnerCard, OwnerOnly } from "./profile/Owner";
import { Chip } from "./StartupBits";

// Server components for the startup profile (Design.md §5 StatCard / RevenueChartCard / StorySection / FounderMessage).

export function StatCard({
  label,
  value,
  caption,
  help,
  className,
}: {
  label: string;
  value: React.ReactNode;
  caption?: React.ReactNode;
  /** Design.md §5 MetricHelp: an info button explaining what the number counts. */
  help?: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("min-w-0 space-y-2 p-4", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-caption font-semibold tracking-wider text-faint uppercase">
          {label}
        </p>
        {help}
      </div>
      <div className="truncate text-2xl font-bold tracking-tight tabular-nums">
        {value}
      </div>
      {caption && (
        <div className="line-clamp-2 text-caption text-muted-foreground sm:truncate">
          {caption}
        </div>
      )}
    </Card>
  );
}

/**
 * Design.md §5 FounderCard: the profile's "ผู้ก่อตั้ง" StatCard, linked to the founder's public
 * profile (/u/{handle}) when they have a username. Hover = the interactive card treatment.
 */
export function FounderCard({
  handle,
  ...card
}: React.ComponentProps<typeof StatCard> & { handle: string | null }) {
  if (!handle) return <StatCard {...card} />;
  return (
    <Link
      href={`/u/${handle}`}
      className="group min-w-0 rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <StatCard
        {...card}
        className={cn(
          "h-full transition-[border-color,transform] group-hover:-translate-y-px group-hover:border-border-strong [&_.truncate]:group-hover:underline",
          card.className,
        )}
      />
    </Link>
  );
}

/**
 * Design.md §5 RevenueChartCard stamp: "✓ ยืนยันผ่าน {Source} · อัปเดตล่าสุด {time}" for one
 * metric's source (revenue/MRR → the revenue provider, visitors → the traffic source).
 */
export async function ChartStamp({
  startup,
  metric,
}: {
  startup: StartupRow;
  metric: "revenue" | "mrr" | "visitors";
}) {
  const [t, v, format] = await Promise.all([
    getTranslations("Profile"),
    getTranslations("Verified"),
    getFormatter(),
  ]);
  if (startup.is_demo)
    return <p className="text-caption text-muted-foreground">{v("sample")}</p>;
  const traffic = metric === "visitors";
  if (!traffic && startup.verification_status === "error")
    return <p className="text-caption text-warning">{v("error")}</p>;
  const source = traffic ? startup.traffic_provider : startup.verified_provider;
  const syncedAt = traffic ? startup.traffic_synced_at : startup.last_synced_at;
  return (
    <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-caption text-muted-foreground">
      {traffic ? (
        <ChartColumnIcon className="size-4" aria-hidden="true" />
      ) : (
        <BadgeCheckIcon className="size-4 text-brand-text" aria-hidden="true" />
      )}
      {/* Visitors are counted, not verified (Design.md §3 Verified vs counted). */}
      {traffic
        ? t("countedBy", {
            source: isSource(source) ? SOURCE_NAME[source] : "",
          })
        : t("chartStamp", {
            source: isSource(source) ? SOURCE_NAME[source] : "",
          })}
      {syncedAt && (
        <span>
          ·{" "}
          {t("chartUpdated", {
            time: format.dateTime(new Date(syncedAt), {
              dateStyle: "medium",
              timeStyle: "short",
            }),
          })}
        </span>
      )}
      {isSyncStale(syncedAt) && (
        <span className="text-warning">· {v("pending")}</span>
      )}
    </p>
  );
}

const chipList = (items: string[]) =>
  items.length ? (
    <div className="flex flex-wrap gap-1.5">
      {items.map((i) => (
        <Chip key={i}>{i}</Chip>
      ))}
    </div>
  ) : null;

const para = (v: string | null) =>
  v ? (
    <p className="font-prose text-xs leading-relaxed whitespace-pre-line text-muted-foreground">
      {v}
    </p>
  ) : null;

type Insight = {
  icon: LucideIcon;
  label: string;
  field: string;
  content: React.ReactNode | null;
};

const logoChips = (items: GlyphRef[]) =>
  items.length ? (
    <div className="flex flex-wrap gap-1.5">
      {items.map((i) => (
        <LogoChip
          key={i.label}
          label={i.label}
          simpleIcon={i.simpleIcon}
          lucideIcon={i.lucideIcon}
        />
      ))}
    </div>
  ) : null;

/** One insight slot: the card for visitors when it has data, the owner's "+ Add" prompt otherwise. */
function Slot({ item, className }: { item: Insight; className?: string }) {
  return item.content ? (
    <InsightCard icon={item.icon} label={item.label}>
      {item.content}
    </InsightCard>
  ) : (
    <EmptyOwnerCard
      field={item.field}
      label={item.label}
      className={className}
    />
  );
}

/**
 * Design.md §5 Story (UX master audit item 6): replaces InsightsGrid. The narrative now lives in one
 * place — the "why" (problem → value → audience) first, the founder's build story next, then the
 * remaining facts (pricing, team, funding, channels, market, stack, AI tools) as a compact list.
 * Visitors see only filled parts; the owner gets the dashed "+ Add" prompts.
 */
export async function StorySection({ startup }: { startup: StartupRow }) {
  const [t, cat, pr, locale, format] = await Promise.all([
    getTranslations("Profile"),
    getTranslations("Catalog"),
    getTranslations("Pricing"),
    getLocale(),
    getFormatter(),
  ]);
  const price = formatPricing(startup, {
    free: pr("free"),
    perMonth: (price) => pr("perMonth", { price }),
    perYear: (price) => pr("perYear", { price }),
    oneTime: (price) => pr("oneTime", { price }),
  });
  const stack = stackGroups(startup.tech_stack, locale);
  const category = getCategory(startup.category);

  // The narrative lines: what it solves → the value → who it's for.
  const why: Insight[] = [
    {
      icon: ShieldCheckIcon,
      label: t("problemSolved"),
      field: "problem_solved",
      content: para(startup.problem_solved),
    },
    {
      icon: LightbulbIcon,
      label: t("valueProposition"),
      field: "value_proposition",
      content: para(startup.value_proposition),
    },
    {
      icon: UsersIcon,
      label: t("audience"),
      field: "audience",
      content: startup.audience ? (
        <div className="flex flex-wrap items-center gap-2">
          {chipList([cat(`audience.${startup.audience}` as "audience.b2b")])}
          {startup.active_users !== null && (
            <span className="text-caption text-muted-foreground tabular-nums">
              {t("approxUsers", { count: format.number(startup.active_users) })}
            </span>
          )}
        </div>
      ) : null,
    },
  ];

  // The remaining facts, as a compact two-column list.
  const facts: Insight[] = [
    {
      icon: DollarSignIcon,
      label: t("pricing"),
      field: "pricing",
      content:
        price || startup.pricing_note ? (
          <div className="space-y-1">
            {price && (
              <p className="text-sm font-semibold tabular-nums">{price}</p>
            )}
            {para(startup.pricing_note)}
          </div>
        ) : null,
    },
    {
      icon: TagIcon,
      label: t("category"),
      field: "category",
      content: logoChips([
        {
          label: categoryName(startup.category, locale),
          lucideIcon: category?.icon,
        },
      ]),
    },
    {
      icon: UserIcon,
      label: t("teamSize"),
      field: "team_size",
      content: startup.team_size
        ? para(cat(`team.${startup.team_size}` as "team.solo"))
        : null,
    },
    {
      icon: LandmarkIcon,
      label: t("funding"),
      field: "funding",
      content: startup.funding
        ? para(cat(`funding.${startup.funding}` as "funding.bootstrapped"))
        : null,
    },
    {
      icon: MegaphoneIcon,
      label: t("marketingChannels"),
      field: "marketing_channels",
      content: logoChips(
        startup.marketing_channels.map((c) => channelChip(c, locale)),
      ),
    },
    {
      icon: Code2Icon,
      label: t("techStack"),
      field: "tech_stack",
      content: stack.length ? (
        // Spec 6.4: logo chips grouped under muted sub-labels, empty groups skipped.
        <div className="space-y-2.5">
          {stack.map((g) => (
            <div key={g.group} className="space-y-1.5">
              <p className="text-2xs text-faint">{g.label}</p>
              {logoChips(
                g.items.map((i) => ({
                  label: i.label,
                  simpleIcon: i.simpleIcon,
                  lucideIcon: i.lucideIcon,
                })),
              )}
            </div>
          ))}
        </div>
      ) : startup.build_stack.length ? (
        // Design.md §5: detected from the connected GitHub repo, never saved over the owner's list.
        <div className="space-y-2">
          {chipList(startup.build_stack)}
          <p className="text-2xs text-faint">{t("detectedStack")}</p>
        </div>
      ) : null,
    },
    {
      icon: SparklesIcon,
      label: t("aiTools"),
      field: "ai_tools",
      content: logoChips(startup.ai_tools.map((x) => aiToolChip(x, locale))),
    },
  ];

  const filled = [...why, ...facts].some((i) => i.content);
  const section = (
    <section className="space-y-3.5">
      <h2 className="text-sm font-bold">{t("storyTitle")}</h2>
      {why.map((item) => (
        <Slot key={item.field} item={item} />
      ))}
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
      <div className="grid gap-3.5 lg:grid-cols-2">
        {facts.map((item) => (
          <Slot key={item.field} item={item} />
        ))}
      </div>
    </section>
  );
  return filled || startup.build_story ? section : <OwnerOnly>{section}</OwnerOnly>;
}


/** Design.md §5 FounderMessage (spec 6.4 step 5): big quote card, hidden when empty. */
export async function FounderMessageCard({ startup }: { startup: StartupRow }) {
  const t = await getTranslations("Profile");
  const owner = startup.owner;
  const name = owner?.display_name ?? owner?.handle ?? startup.name;
  if (!startup.founder_message) {
    return (
      <EmptyOwnerCard field="founder_message" label={t("founderMessage")} />
    );
  }
  return (
    <section aria-label={t("founderMessage")}>
      <Card className="flex flex-col gap-5 p-5 sm:flex-row sm:p-6">
        <PersonPhoto
          src={owner?.avatar_url}
          className="size-20 shrink-0 rounded-full border object-cover"
          fallback={
            <span
              aria-hidden="true"
              className="flex size-20 shrink-0 items-center justify-center rounded-full border bg-secondary text-2xl font-bold text-muted-foreground uppercase"
            >
              {name.slice(0, 1)}
            </span>
          }
        />
        <figure className="min-w-0 space-y-4">
          <p className="text-2xs font-bold tracking-wider text-faint uppercase">
            {t("founderMessage")}
          </p>
          <blockquote className="font-prose text-base leading-[1.8] whitespace-pre-line">
            {startup.founder_message}
          </blockquote>
          <figcaption className="text-sm">
            {owner?.handle ? (
              <Link
                href={`/u/${owner.handle}`}
                className="font-bold hover:underline"
              >
                {name}
              </Link>
            ) : (
              <span className="font-bold">{name}</span>
            )}
            {startup.founder_role && (
              <span className="text-muted-foreground">
                {" "}
                · {startup.founder_role}
              </span>
            )}
          </figcaption>
        </figure>
      </Card>
    </section>
  );
}
