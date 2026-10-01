"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { usePathname } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { CoarseGeo } from "@/lib/live/geo";
import {
  LIVE_ENABLED,
  createIdentity,
  isIdentity,
  pageSection,
  parseVisitor,
  type LiveIdentity,
  type LiveVisitor,
  type PageSection,
} from "@/lib/live/identity";
import { createClient } from "@/lib/supabase/client";

/**
 * Phase 8 live visitors (Design.md §5 LivePresence). One Supabase Realtime presence channel for
 * the whole site, open only while the tab is visible. Each browser tracks an anonymous identity
 * (random id + word-list name), the page path, device and coarse location; page changes are
 * broadcast for the activity feed. Everything received is validated (`parseVisitor`).
 * Fallback: a heartbeat every 60 s to /api/live/ping, and when Realtime fails the count comes
 * from /api/live/count (cached 30 s).
 */

export type LiveEvent = {
  key: string;
  c: number;
  a: number;
  section: PageSection;
  at: number;
};

type LiveState = {
  status: "off" | "connecting" | "live" | "fallback";
  /** This browser chose not to appear (it still sees the others). */
  optedOut: boolean;
  me: LiveVisitor | null;
  visitors: LiveVisitor[];
  events: LiveEvent[];
  fallbackCount: number | null;
};

const LiveContext = createContext<LiveState>({
  status: "off",
  optedOut: false,
  me: null,
  visitors: [],
  events: [],
  fallbackCount: null,
});

export const useLive = () => useContext(LiveContext);

// Opt-out (privacy page + live section): no presence tracking and no heartbeats from this browser.
const OPT_KEY = "jaopor.live.optout";
const OPT_EVENT = "jaopor:live-optout";
function readOptOut() {
  try {
    return localStorage.getItem(OPT_KEY) === "1";
  } catch {
    return false;
  }
}
function subscribeOptOut(on: () => void) {
  window.addEventListener(OPT_EVENT, on);
  window.addEventListener("storage", on);
  return () => {
    window.removeEventListener(OPT_EVENT, on);
    window.removeEventListener("storage", on);
  };
}
export function setLiveOptOut(value: boolean) {
  try {
    if (value) localStorage.setItem(OPT_KEY, "1");
    else localStorage.removeItem(OPT_KEY);
  } catch {}
  window.dispatchEvent(new Event(OPT_EVENT));
}

const ID_KEY = "jaopor.live.id";
const GEO_KEY = "jaopor.live.geo";

// One identity per browser, read once and cached (a stable snapshot for useSyncExternalStore).
let identityCache: LiveIdentity | null = null;
function loadIdentity(): LiveIdentity {
  if (identityCache) return identityCache;
  try {
    const saved = JSON.parse(localStorage.getItem(ID_KEY) ?? "null");
    if (isIdentity(saved)) return (identityCache = saved);
    const fresh = createIdentity();
    localStorage.setItem(ID_KEY, JSON.stringify(fresh));
    return (identityCache = fresh);
  } catch {
    return (identityCache ??= createIdentity());
  }
}
const noop = () => () => {};

function subscribeVisibility(onChange: () => void) {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
}

async function loadGeo(): Promise<CoarseGeo> {
  const empty = { country: null, province: null, lat: null, lng: null };
  try {
    const cached = sessionStorage.getItem(GEO_KEY);
    if (cached) return JSON.parse(cached) as CoarseGeo;
  } catch {}
  try {
    const res = await fetch("/api/live/whoami", { cache: "no-store" });
    const geo = res.ok ? ((await res.json()) as CoarseGeo) : empty;
    try {
      sessionStorage.setItem(GEO_KEY, JSON.stringify(geo));
    } catch {}
    return geo;
  } catch {
    return empty;
  }
}

const isMobile = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(pointer: coarse)").matches;

export function LivePresenceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const visible = useSyncExternalStore(
    subscribeVisibility,
    () => document.visibilityState === "visible",
    () => false,
  );
  const identity = useSyncExternalStore(noop, loadIdentity, () => null);
  const optedOut = useSyncExternalStore(
    subscribeOptOut,
    readOptOut,
    () => false,
  );
  const [geo, setGeo] = useState<CoarseGeo | null>(null);
  // Channel outcome; "connecting" / "off" are derived below.
  const [joined, setJoined] = useState<"live" | "fallback" | null>(null);
  const [visitors, setVisitors] = useState<LiveVisitor[]>([]);
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [fallbackCount, setFallbackCount] = useState<number | null>(null);
  const channel = useRef<RealtimeChannel | null>(null);
  const lastBroadcast = useRef(0);

  // Coarse location, once per tab.
  useEffect(() => {
    if (LIVE_ENABLED) loadGeo().then(setGeo);
  }, []);

  const me = useMemo<LiveVisitor | null>(
    () =>
      identity && geo
        ? {
            ...identity,
            path: pathname.slice(0, 200),
            country: geo.country,
            province: geo.province,
            lat: geo.lat,
            lng: geo.lng,
            device: isMobile() ? "mobile" : "desktop",
          }
        : null,
    [identity, geo, pathname],
  );
  const meRef = useRef(me);
  useEffect(() => {
    meRef.current = me;
  }, [me]);

  // Realtime presence: connect while visible, leave when hidden.
  const ready = LIVE_ENABLED && identity !== null && geo !== null;
  const status: LiveState["status"] =
    !ready || !visible ? "off" : (joined ?? "connecting");
  useEffect(() => {
    if (!ready || !visible || !identity) return;
    const supabase = createClient();
    const ch = supabase.channel("live-visitors", {
      config: {
        presence: { key: identity.id },
        broadcast: { self: false },
      },
    });
    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState();
      const list: LiveVisitor[] = [];
      for (const metas of Object.values(state)) {
        const v = parseVisitor(metas[0]);
        if (v) list.push(v);
      }
      setVisitors(list.slice(0, 500));
    })
      .on("broadcast", { event: "page_view" }, ({ payload }) => {
        const v = parseVisitor(payload);
        if (!v) return;
        setEvents((prev) =>
          [
            {
              key: `${v.id}-${Date.now()}`,
              c: v.c,
              a: v.a,
              section: pageSection(v.path),
              at: Date.now(),
            },
            ...prev,
          ].slice(0, 8),
        );
      })
      .subscribe((s) => {
        if (s === "SUBSCRIBED") {
          setJoined("live");
          if (meRef.current && !readOptOut()) ch.track(meRef.current);
        } else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT") {
          setJoined("fallback");
        }
      });
    channel.current = ch;
    return () => {
      channel.current = null;
      supabase.removeChannel(ch);
      setJoined(null);
    };
  }, [ready, visible, identity]);

  // Page change: update presence + broadcast it to the others' feeds (throttled).
  useEffect(() => {
    const ch = channel.current;
    if (!me || !ch || status !== "live") return;
    if (optedOut) {
      ch.untrack();
      return;
    }
    ch.track(me);
    if (Date.now() - lastBroadcast.current > 3000) {
      lastBroadcast.current = Date.now();
      ch.send({ type: "broadcast", event: "page_view", payload: me });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on path/status/opt-out changes
  }, [me?.path, status, optedOut]);

  // Heartbeat (always while visible) and the fallback count (only when Realtime failed).
  useEffect(() => {
    if (!LIVE_ENABLED || !visible || !me || optedOut) return;
    const ping = () =>
      fetch("/api/live/ping", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: me.id,
          c: me.c,
          a: me.a,
          path: me.path,
          device: me.device,
        }),
        keepalive: true,
      }).catch(() => {});
    ping();
    const t = setInterval(ping, 60_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-ping on page change only
  }, [visible, me?.path, me?.id, optedOut]);

  useEffect(() => {
    if (status !== "fallback") return;
    const poll = () =>
      fetch("/api/live/count")
        .then((r) => r.json() as Promise<{ count: number | null }>)
        .then((d) => setFallbackCount(d.count))
        .catch(() => {});
    poll();
    const t = setInterval(poll, 30_000);
    return () => clearInterval(t);
  }, [status]);

  const value = useMemo(
    () => ({
      status,
      optedOut,
      me,
      // An opted-out browser isn't in presence; don't show it to itself either.
      visitors:
        optedOut && me ? visitors.filter((v) => v.id !== me.id) : visitors,
      events,
      fallbackCount,
    }),
    [status, optedOut, me, visitors, events, fallbackCount],
  );
  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
}
