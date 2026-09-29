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
import { getFormatter, getTranslations } from "next-intl/server";
import { isSyncStale, type Owner, type StartupRow } from "@/lib/data/startups";
import { SOURCE_NAME, isSource } from "@/lib/sources/catalog";
import { cn } from "@/lib/utils";
import { EmptyValue } from "./profile/Owner";
import { Chip } from "./StartupBits";

// Server components for the startup profile (Design.md §5 StatTile / VerifiedStamp / InsightsGrid).

export function StatTile({
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
    <div
      className={cn(
        "min-w-0 space-y-2 rounded-xl border bg-card p-4",
        className,
      )}
    >
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
    </div>
  );
}

export async function VerifiedStamp({ startup }: { startup: StartupRow }) {
  const t = await getTranslations("Verified");
  const format = await getFormatter();

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
      <BadgeCheckIcon className="size-4 text-brand" aria-hidden="true" />
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

/**
 * Design.md §5 InsightsGrid card. Every field is always rendered (TrustMRR pattern); an empty
 * one shows "+ Add" to the owner (deep link to the editor) or "Not added" to visitors.
 */
function InsightCard({
  icon: Icon,
  label,
  field,
  children,
  wide = false,
}: {
  icon: LucideIcon;
  label: string;
  field: string;
  children: React.ReactNode | null;
  wide?: boolean;
}) {
  return (
    <div
      className={cn(
        "space-y-3 rounded-xl border bg-card p-4",
        wide && "sm:col-span-2",
      )}
    >
      <p className="flex items-center gap-2 text-2xs font-bold tracking-wider text-faint uppercase">
        <Icon className="size-3.5" aria-hidden="true" />
        {label}
      </p>
      <div>{children ?? <EmptyValue field={field} />}</div>
    </div>
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

export async function InsightsGrid({ startup }: { startup: StartupRow }) {
  const t = await getTranslations("Profile");
  const cat = await getTranslations("Catalog");

  return (
    <section>
      <h2 className="mb-4 text-sm font-bold">{t("insights")}</h2>
      <div className="grid gap-3.5 sm:grid-cols-2">
        <InsightCard
          icon={LightbulbIcon}
          label={t("valueProposition")}
          field="value_proposition"
        >
          {para(startup.value_proposition)}
        </InsightCard>
        <InsightCard
          icon={ShieldCheckIcon}
          label={t("problemSolved")}
          field="problem_solved"
        >
          {para(startup.problem_solved)}
        </InsightCard>
        <InsightCard icon={UsersIcon} label={t("audience")} field="audience">
          {startup.audience
            ? chipList([cat(`audience.${startup.audience}` as "audience.b2b")])
            : null}
        </InsightCard>
        <InsightCard icon={TagIcon} label={t("category")} field="category">
          {chipList([cat(`category.${startup.category}` as "category.ai")])}
        </InsightCard>
        <InsightCard icon={DollarSignIcon} label={t("pricing")} field="pricing">
          {para(startup.pricing)}
        </InsightCard>
        <InsightCard icon={Code2Icon} label={t("techStack")} field="tech_stack">
          {chipList(startup.tech_stack)}
        </InsightCard>
        <InsightCard icon={UserIcon} label={t("teamSize")} field="team_size">
          {startup.team_size
            ? para(cat(`team.${startup.team_size}` as "team.solo"))
            : null}
        </InsightCard>
        <InsightCard icon={SparklesIcon} label={t("aiTools")} field="ai_tools">
          {chipList(
            startup.ai_tools.map((x) => cat(`tool.${x}` as "tool.claude-code")),
          )}
        </InsightCard>
        <InsightCard icon={LandmarkIcon} label={t("funding")} field="funding">
          {startup.funding
            ? para(cat(`funding.${startup.funding}` as "funding.bootstrapped"))
            : null}
        </InsightCard>
        <InsightCard
          icon={MegaphoneIcon}
          label={t("marketingChannels")}
          field="marketing_channels"
        >
          {chipList(startup.marketing_channels)}
        </InsightCard>
        <FounderMessage
          message={startup.founder_message}
          owner={startup.owner}
          name={startup.name}
          label={t("founderMessage")}
          founderOf={t("founderOf", { name: startup.name })}
        />
      </div>
    </section>
  );
}

function FounderMessage({
  message,
  owner,
  label,
  founderOf,
}: {
  message: string | null;
  owner: Owner | null;
  name: string;
  label: string;
  founderOf: string;
}) {
  return (
    <InsightCard icon={QuoteIcon} label={label} field="founder_message" wide>
      {message ? (
        <figure>
          <blockquote className="text-xs leading-relaxed">
            “{message}”
          </blockquote>
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
      ) : null}
    </InsightCard>
  );
}
