import {
  BadgeCheckIcon,
  Code2Icon,
  DollarSignIcon,
  LandmarkIcon,
  LightbulbIcon,
  MegaphoneIcon,
  QuoteIcon,
  ShieldCheckIcon,
  SparklesIcon,
  TagIcon,
  UserIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { categoryName, channelLabel, stackGroups } from "@/lib/config/display";
import { aiToolLabel, type AiTool } from "@/lib/config/stack";
import { formatPricing } from "@/lib/pricing";
import { isSyncStale, type Owner, type StartupRow } from "@/lib/data/startups";
import { SOURCE_NAME, isSource } from "@/lib/sources/catalog";
import { cn } from "@/lib/utils";
import { Card } from "./core/Card";
import { InsightCard } from "./core/InsightCard";
import { EmptyOwnerCard, OwnerOnly } from "./profile/Owner";
import { Chip } from "./StartupBits";

// Server components for the startup profile (Design.md §5 StatTile / VerifiedStamp / InsightsGrid).

export function StatCard({
  label,
  value,
  caption,
  className,
}: {
  label: string;
  value: React.ReactNode;
  caption?: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("min-w-0 space-y-2 p-4", className)}>
      <p className="truncate text-caption font-semibold tracking-wider text-faint uppercase">
        {label}
      </p>
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

export async function VerifiedStamp({ startup }: { startup: StartupRow }) {
  const t = await getTranslations("Verified");
  const format = await getFormatter();

  if (startup.is_demo) {
    return (
      <p className="text-center text-caption text-muted-foreground">
        {t("sample")}
      </p>
    );
  }
  if (startup.verification_status === "error") {
    return (
      <p className="text-center text-caption text-warning">{t("error")}</p>
    );
  }
  const synced = startup.last_synced_at
    ? new Date(startup.last_synced_at)
    : null;
  const stale = isSyncStale(startup.last_synced_at);

  return (
    <p className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-center text-caption text-muted-foreground">
      <BadgeCheckIcon className="size-4 text-brand-text" aria-hidden="true" />
      {t.rich("stamp", {
        provider: isSource(startup.verified_provider)
          ? SOURCE_NAME[startup.verified_provider]
          : "",
        b: (chunks) => (
          <b className="font-semibold text-foreground">{chunks}</b>
        ),
      })}
      {synced && (
        <span>
          {t("updated", {
            time: format.dateTime(synced, {
              dateStyle: "medium",
              timeStyle: "short",
            }),
          })}
        </span>
      )}
      {stale && <span className="text-warning">· {t("pending")}</span>}
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
    <p className="text-xs leading-relaxed whitespace-pre-line text-muted-foreground">
      {v}
    </p>
  ) : null;

type Insight = {
  icon: LucideIcon;
  label: string;
  field: string;
  content: React.ReactNode | null;
  wide?: boolean;
};

export async function InsightsGrid({ startup }: { startup: StartupRow }) {
  const [t, cat, pr, locale] = await Promise.all([
    getTranslations("Profile"),
    getTranslations("Catalog"),
    getTranslations("Pricing"),
    getLocale(),
  ]);
  const price = formatPricing(startup, {
    free: pr("free"),
    perMonth: (price) => pr("perMonth", { price }),
    perYear: (price) => pr("perYear", { price }),
    oneTime: (price) => pr("oneTime", { price }),
  });
  const stack = stackGroups(startup.tech_stack, locale);

  const items: Insight[] = [
    {
      icon: LightbulbIcon,
      label: t("valueProposition"),
      field: "value_proposition",
      content: para(startup.value_proposition),
    },
    {
      icon: ShieldCheckIcon,
      label: t("problemSolved"),
      field: "problem_solved",
      content: para(startup.problem_solved),
    },
    {
      icon: UsersIcon,
      label: t("audience"),
      field: "audience",
      content: startup.audience
        ? chipList([cat(`audience.${startup.audience}` as "audience.b2b")])
        : null,
    },
    {
      icon: TagIcon,
      label: t("category"),
      field: "category",
      content: chipList([categoryName(startup.category, locale)]),
    },
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
      icon: Code2Icon,
      label: t("techStack"),
      field: "tech_stack",
      content: stack.length ? (
        // Spec 6.4: grouped under muted sub-labels, empty groups skipped (logo chips: Phase 2).
        <div className="space-y-2.5">
          {stack.map((g) => (
            <div key={g.group} className="space-y-1.5">
              <p className="text-2xs text-faint">{g.label}</p>
              {chipList(g.items.map((i) => i.label))}
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
      icon: UserIcon,
      label: t("teamSize"),
      field: "team_size",
      content: startup.team_size
        ? para(cat(`team.${startup.team_size}` as "team.solo"))
        : null,
    },
    {
      icon: SparklesIcon,
      label: t("aiTools"),
      field: "ai_tools",
      content: chipList(
        startup.ai_tools.map((x) => aiToolLabel(x as AiTool, locale)),
      ),
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
      content: chipList(
        startup.marketing_channels.map((c) => channelLabel(c, locale)),
      ),
    },
    {
      icon: QuoteIcon,
      label: t("founderMessage"),
      field: "founder_message",
      wide: true,
      content: startup.founder_message ? (
        <FounderMessage
          message={startup.founder_message}
          owner={startup.owner}
          founderOf={t("founderOf", { name: startup.name })}
        />
      ) : null,
    },
  ];

  // Spec 2.4: visitors only see fields that have data; the owner sees dashed prompts for the rest.
  const grid = (
    <section>
      <h2 className="mb-4 text-sm font-bold">{t("insights")}</h2>
      <div className="grid gap-3.5 sm:grid-cols-2">
        {items.map((i) =>
          i.content ? (
            <InsightCard
              key={i.field}
              icon={i.icon}
              label={i.label}
              wide={i.wide}
            >
              {i.content}
            </InsightCard>
          ) : (
            <EmptyOwnerCard
              key={i.field}
              field={i.field}
              label={i.label}
              className={i.wide ? "sm:col-span-2" : undefined}
            />
          ),
        )}
      </div>
    </section>
  );
  return items.some((i) => i.content) ? grid : <OwnerOnly>{grid}</OwnerOnly>;
}

function FounderMessage({
  message,
  owner,
  founderOf,
}: {
  message: string;
  owner: Owner | null;
  founderOf: string;
}) {
  return (
    <figure>
      <blockquote className="text-xs leading-relaxed">“{message}”</blockquote>
      <figcaption className="mt-3 flex items-center gap-2 text-caption text-muted-foreground">
        {owner?.avatar_url && (
          <Image
            src={owner.avatar_url}
            alt=""
            width={20}
            height={20}
            className="size-5 rounded-full"
          />
        )}
        <span>
          <span className="font-medium text-foreground">
            {owner?.display_name ?? ""}
          </span>{" "}
          · {founderOf}
        </span>
      </figcaption>
    </figure>
  );
}
