"use client";

import { EyeIcon, GlobeIcon, MapIcon, XIcon } from "lucide-react";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { REGION_PATH } from "@/components/olympics/ThailandMap";
import { localizedName } from "@/lib/config/localized";
import { REGION_LIST, getProvince } from "@/lib/config/provinces";
import { avatarUri } from "@/lib/live/avatar";
import {
  LIVE_ENABLED,
  pageSection,
  visitorName,
  type LiveVisitor,
  type PageSection,
} from "@/lib/live/identity";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { setLiveOptOut, useLive } from "./LivePresence";

const WorldMap = dynamic(() => import("./WorldMap"), {
  ssr: false,
  loading: () => <div className="size-full animate-pulse bg-secondary/40" />,
});

const HIDE_KEY = "jaopor.live.hidden";
const EVENT = "jaopor:live-hidden";

function readHidden() {
  try {
    return localStorage.getItem(HIDE_KEY) === "1";
  } catch {
    return false;
  }
}
function subscribeHidden(on: () => void) {
  window.addEventListener(EVENT, on);
  return () => window.removeEventListener(EVENT, on);
}
function setHidden(v: boolean) {
  try {
    if (v) localStorage.setItem(HIDE_KEY, "1");
    else localStorage.removeItem(HIDE_KEY);
  } catch {}
  window.dispatchEvent(new Event(EVENT));
}

/** Map projection shared with ThailandMap (viewBox 84 × 150). */
const project = (lat: number, lng: number) => ({
  x: (lng - 97.3) * 10,
  y: (20.5 - lat) * 10,
});

function top<T extends string>(items: T[], n: number): [T, number][] {
  const counts = new Map<T, number>();
  for (const i of items) counts.set(i, (counts.get(i) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
}

/**
 * Design.md §5 LiveVisitorsSection ("ตอนนี้มีคนดูอยู่", Phase 8): Thailand map with avatar pins per
 * province (count badge when more than one), a world map toggle (MapLibre + OpenFreeMap, loaded
 * on demand), live count + countries / devices / pages, and the last 4 page views.
 */
export function LiveVisitorsSection() {
  const t = useTranslations("Live");
  const locale = useLocale();
  const { status, optedOut, me, visitors, events, fallbackCount } = useLive();
  const hidden = useSyncExternalStore(subscribeHidden, readHidden, () => false);
  const [world, setWorld] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, []);

  if (!LIVE_ENABLED) return null;
  if (hidden)
    return (
      <div className="mt-9 text-center">
        <button
          type="button"
          onClick={() => setHidden(false)}
          className="inline-flex items-center gap-1.5 text-caption text-faint hover:text-foreground"
        >
          <EyeIcon className="size-3.5" aria-hidden="true" />
          {t("show")}
        </button>
      </div>
    );

  // Include myself even before the channel syncs.
  const all: LiveVisitor[] =
    me && !optedOut && !visitors.some((v) => v.id === me.id)
      ? [me, ...visitors]
      : visitors;
  const count = status === "fallback" ? fallbackCount : all.length;
  const thai = all.filter((v) => v.province);
  const byProvince = new Map<string, LiveVisitor[]>();
  for (const v of thai)
    byProvince.set(v.province!, [...(byProvince.get(v.province!) ?? []), v]);
  const abroad = all.filter((v) => v.country && v.country !== "TH").length;
  const countryName = (code: string) => {
    try {
      return (
        new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? code
      );
    } catch {
      return code;
    }
  };
  const ago = (at: number) => {
    const m = Math.floor((now - at) / 60_000);
    return m < 1 ? t("justNow") : t("minutesAgo", { m });
  };

  return (
    <section
      ref={ref}
      aria-labelledby="live-title"
      className="mt-9 overflow-hidden rounded-xl border bg-card"
    >
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3 sm:px-5">
        <h2
          id="live-title"
          className="flex items-center gap-2 text-sm font-bold"
        >
          <span
            aria-hidden="true"
            className={cn(
              "size-2 rounded-full",
              status === "live"
                ? "animate-pulse bg-positive"
                : status === "fallback"
                  ? "bg-warning"
                  : "bg-faint",
            )}
          />
          {t("title")}
        </h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setWorld((w) => !w)}
            aria-pressed={world}
            className="inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-caption hover:bg-accent"
          >
            {world ? (
              <MapIcon className="size-3.5" aria-hidden="true" />
            ) : (
              <GlobeIcon className="size-3.5" aria-hidden="true" />
            )}
            {world ? t("thailand") : t("world")}
          </button>
          <button
            type="button"
            onClick={() => setHidden(true)}
            aria-label={t("hide")}
            className="inline-flex size-7 items-center justify-center rounded-md text-faint hover:bg-accent hover:text-foreground"
          >
            <XIcon className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="relative h-[420px] sm:h-[460px]">
        {/* Map */}
        {world ? (
          <WorldMap visitors={all} />
        ) : (
          <div className="flex size-full items-center justify-center p-4 sm:justify-end sm:pr-[12%]">
            <svg
              viewBox="-4 -4 92 158"
              className="h-full w-auto overflow-visible"
              role="img"
              aria-label={t("mapLabel", { n: thai.length })}
            >
              {REGION_LIST.map((r) => (
                <path
                  key={r.slug}
                  d={REGION_PATH[r.slug]}
                  className="fill-muted-foreground/15 stroke-card stroke-[0.8]"
                  strokeLinejoin="round"
                />
              ))}
              {[...byProvince.entries()].map(([slug, list]) => {
                const p = getProvince(slug)!;
                const { x, y } = project(p.lat, p.lng);
                return (
                  <g key={slug}>
                    <title>
                      {`${localizedName(p, locale)} · ${t("people", { n: list.length })}`}
                    </title>
                    <circle cx={x} cy={y} r={4.6} className="fill-brand" />
                    <image
                      href={avatarUri(list[0].id)}
                      x={x - 4}
                      y={y - 4}
                      width={8}
                      height={8}
                      clipPath="circle(50%)"
                    />
                    {list.length > 1 && (
                      <>
                        <circle
                          cx={x + 4}
                          cy={y - 4}
                          r={2.6}
                          className="fill-positive"
                        />
                        <text
                          x={x + 4}
                          y={y - 3.1}
                          textAnchor="middle"
                          className="fill-background text-[2.6px] font-bold"
                        >
                          {list.length}
                        </text>
                      </>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        )}

        {/* Stats overlay */}
        <div className="absolute top-3 left-3 w-56 rounded-lg border bg-background/85 p-3 backdrop-blur sm:top-4 sm:left-4">
          <p className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold tabular-nums">
              {count ?? "–"}
            </span>
            <span className="text-caption text-muted-foreground">
              {t("watching")}
            </span>
          </p>
          {status === "fallback" && (
            <p className="mt-1 text-2xs text-warning">{t("approx")}</p>
          )}
          {status !== "fallback" && all.length > 0 && (
            <dl className="mt-2 space-y-1.5 text-2xs">
              <Row
                label={t("countries")}
                items={top(
                  all.map((v) => v.country ?? "??"),
                  3,
                ).map(([c, n]) => [
                  c === "??" ? t("unknown") : countryName(c),
                  n,
                ])}
              />
              <Row
                label={t("devices")}
                items={top(
                  all.map((v) => v.device),
                  2,
                ).map(([d, n]) => [t(`device.${d}`), n])}
              />
              <Row
                label={t("pages")}
                items={top(
                  all.map((v) => pageSection(v.path)),
                  3,
                ).map(([s, n]) => [t(`sections.${s as PageSection}`), n])}
              />
            </dl>
          )}
          {!world && abroad > 0 && (
            <p className="mt-2 text-2xs text-muted-foreground">
              {t("abroad", { n: abroad })}
            </p>
          )}
        </div>

        {/* Activity feed */}
        <ol
          aria-label={t("feed")}
          className="absolute bottom-3 left-3 w-64 max-w-[calc(100%-1.5rem)] space-y-1.5 sm:bottom-4 sm:left-4"
        >
          {events.slice(0, 4).map((e) => (
            <li
              key={e.key}
              className="flex items-center gap-2 rounded-md border bg-background/85 px-2 py-1.5 text-2xs backdrop-blur"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- local data URI */}
              <img
                src={avatarUri(e.key.slice(0, 36))}
                alt=""
                className="size-5 shrink-0 rounded-full"
              />
              <span className="min-w-0 truncate">
                <b className="font-semibold">{visitorName(e, locale)}</b>{" "}
                {t("viewed", { section: t(`sections.${e.section}`) })}
              </span>
              <span className="ml-auto shrink-0 text-faint">{ago(e.at)}</span>
            </li>
          ))}
        </ol>
      </div>
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t px-4 py-2.5 text-2xs text-muted-foreground sm:px-5">
        {me && !optedOut ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- local data URI */}
            <img
              src={avatarUri(me.id)}
              alt=""
              className="size-4 rounded-full"
            />
            {t("youAre", { name: visitorName(me, locale) })}
            <button
              type="button"
              onClick={() => setLiveOptOut(true)}
              className="text-faint underline-offset-2 hover:text-foreground hover:underline"
            >
              {t("optOut")}
            </button>
          </>
        ) : optedOut ? (
          <>
            {t("optedOut")}
            <button
              type="button"
              onClick={() => setLiveOptOut(false)}
              className="text-faint underline-offset-2 hover:text-foreground hover:underline"
            >
              {t("optIn")}
            </button>
          </>
        ) : null}
        <Link
          href={{ pathname: "/privacy", hash: "live" }}
          className="ml-auto text-faint underline-offset-2 hover:text-foreground hover:underline"
        >
          {t("anonymousNote")}
        </Link>
      </p>
    </section>
  );
}

function Row({ label, items }: { label: string; items: [string, number][] }) {
  return (
    <div className="flex gap-2">
      <dt className="w-14 shrink-0 text-faint">{label}</dt>
      <dd className="min-w-0 truncate text-foreground/90">
        {items.map(([k, n]) => `${k} ${n}`).join(" · ")}
      </dd>
    </div>
  );
}
