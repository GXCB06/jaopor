import { CheckCircle2Icon } from "lucide-react";
import Image from "next/image";
import { getFormatter, getTranslations } from "next-intl/server";
import { isSyncStale, type Owner, type StartupRow } from "@/lib/data/startups";
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
    return <p className="text-xs text-amber-400">{t("error")}</p>;
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
      {stale && <span className="text-amber-400">· {t("pending")}</span>}
    </p>
  );
}

export async function InsightsGrid({ startup }: { startup: StartupRow }) {
  const t = await getTranslations("Profile");
  const cat = await getTranslations("Catalog");

  const blocks: Array<[string, React.ReactNode]> = [];
  const text = (label: string, v: string | null) =>
    v &&
    blocks.push([
      label,
      <p key={label} className="text-sm">
        {v}
      </p>,
    ]);
  const chips = (label: string, items: string[]) =>
    items.length > 0 &&
    blocks.push([
      label,
      <div key={label} className="flex flex-wrap gap-1.5">
        {items.map((i) => (
          <Chip key={i}>{i}</Chip>
        ))}
      </div>,
    ]);

  text(t("valueProposition"), startup.value_proposition);
  text(t("problemSolved"), startup.problem_solved);
  if (startup.audience)
    text(t("audience"), cat(`audience.${startup.audience}` as "audience.b2b"));
  text(t("pricing"), startup.pricing);
  if (startup.team_size)
    text(t("teamSize"), cat(`team.${startup.team_size}` as "team.solo"));
  if (startup.funding)
    text(
      t("funding"),
      cat(`funding.${startup.funding}` as "funding.bootstrapped"),
    );
  chips(t("category"), [cat(`category.${startup.category}` as "category.ai")]);
  chips(
    t("aiTools"),
    startup.ai_tools.map((x) => cat(`tool.${x}` as "tool.claude-code")),
  );
  chips(t("techStack"), startup.tech_stack);
  chips(t("marketingChannels"), startup.marketing_channels);

  if (blocks.length === 0) return null;
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold">{t("insights")}</h2>
      <div className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2">
        {blocks.map(([label, content]) => (
          <div key={label}>
            <MetricLabel>{label}</MetricLabel>
            {content}
          </div>
        ))}
      </div>
    </section>
  );
}

export async function FounderMessage({
  message,
  owner,
  name,
}: {
  message: string;
  owner: Owner | null;
  name: string;
}) {
  const t = await getTranslations("Profile");
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
