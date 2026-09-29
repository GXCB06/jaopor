import { CheckCircle2Icon } from "lucide-react";
import Image from "next/image";
import { getFormatter, getTranslations } from "next-intl/server";
import { isSyncStale, type Owner, type StartupRow } from "@/lib/data/startups";
import { cn } from "@/lib/utils";
import { EmptyValue } from "./profile/Owner";
import { Chip, MetricLabel } from "./StartupBits";

// Server components for the startup profile (Design.md §5 StatTile / VerifiedStamp / InsightsGrid / FounderMessage).

export function StatTile({
  label,
  value,
  caption,
}: {
  label: string;
  value: React.ReactNode;
  caption?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border p-3">
      <MetricLabel>{label}</MetricLabel>
      <div className="truncate text-2xl font-bold tabular-nums md:text-3xl">
        {value}
      </div>
      {caption && (
        <div className="mt-1 truncate text-xs text-muted-foreground">
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
    return <p className="text-xs text-warning">{t("error")}</p>;
  }
  const synced = startup.last_synced_at
    ? new Date(startup.last_synced_at)
    : null;
  const stale = isSyncStale(startup.last_synced_at);

  return (
    <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
      <CheckCircle2Icon className="size-3.5 text-brand" aria-hidden="true" />
      {t.rich("stamp", {
        provider: "Stripe",
        b: (chunks) => <b>{chunks}</b>,
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
 * Design.md §5 InfoCard. Every field is always rendered (TrustMRR pattern); an empty one shows
 * "+ Add" to the owner (deep link to the editor) or "Not added" to visitors.
 */
function InfoCard({
  label,
  field,
  children,
  wide = false,
}: {
  label: string;
  field: string;
  children: React.ReactNode | null;
  wide?: boolean;
}) {
  return (
    <div className={cn("rounded-lg border p-3", wide && "sm:col-span-2")}>
      <MetricLabel>{label}</MetricLabel>
      <div className="mt-1">{children ?? <EmptyValue field={field} />}</div>
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
  v ? <p className="text-sm whitespace-pre-line">{v}</p> : null;

export async function InsightsGrid({ startup }: { startup: StartupRow }) {
  const t = await getTranslations("Profile");
  const cat = await getTranslations("Catalog");

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold">{t("insights")}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <InfoCard label={t("valueProposition")} field="value_proposition" wide>
          {para(startup.value_proposition)}
        </InfoCard>
        <InfoCard label={t("problemSolved")} field="problem_solved" wide>
          {para(startup.problem_solved)}
        </InfoCard>
        <InfoCard label={t("audience")} field="audience">
          {startup.audience
            ? para(cat(`audience.${startup.audience}` as "audience.b2b"))
            : null}
        </InfoCard>
        <InfoCard label={t("pricing")} field="pricing">
          {para(startup.pricing)}
        </InfoCard>
        <InfoCard label={t("teamSize")} field="team_size">
          {startup.team_size
            ? para(cat(`team.${startup.team_size}` as "team.solo"))
            : null}
        </InfoCard>
        <InfoCard label={t("funding")} field="funding">
          {startup.funding
            ? para(cat(`funding.${startup.funding}` as "funding.bootstrapped"))
            : null}
        </InfoCard>
        <InfoCard label={t("category")} field="category">
          {chipList([cat(`category.${startup.category}` as "category.ai")])}
        </InfoCard>
        <InfoCard label={t("aiTools")} field="ai_tools">
          {chipList(
            startup.ai_tools.map((x) => cat(`tool.${x}` as "tool.claude-code")),
          )}
        </InfoCard>
        <InfoCard label={t("techStack")} field="tech_stack">
          {chipList(startup.tech_stack)}
        </InfoCard>
        <InfoCard label={t("marketingChannels")} field="marketing_channels">
          {chipList(startup.marketing_channels)}
        </InfoCard>
      </div>
    </section>
  );
}

export async function FounderMessage({
  message,
  owner,
  name,
}: {
  message: string | null;
  owner: Owner | null;
  name: string;
}) {
  const t = await getTranslations("Profile");
  if (!message) {
    return (
      <section>
        <h2 className="mb-3 text-sm font-semibold">{t("founderMessage")}</h2>
        <div className="rounded-lg border p-4">
          <EmptyValue field="founder_message" />
        </div>
      </section>
    );
  }
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold">{t("founderMessage")}</h2>
      <figure className="rounded-lg border p-4">
        <blockquote className="text-sm">“{message}”</blockquote>
        <figcaption className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          {owner?.avatar_url && (
            <Image
              src={owner.avatar_url}
              alt=""
              width={24}
              height={24}
              className="rounded-full"
            />
          )}
          <span>
            <span className="font-medium text-foreground">
              {owner?.display_name ?? ""}
            </span>{" "}
            · {t("founderOf", { name })}
          </span>
        </figcaption>
      </figure>
    </section>
  );
}
