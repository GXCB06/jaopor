"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import maplibregl from "maplibre-gl";
import { useEffect, useRef } from "react";
import { avatarUri } from "@/lib/live/avatar";
import type { LiveVisitor } from "@/lib/live/identity";

// Phase 8 "🌏 ทั่วโลก": MapLibre GL with OpenFreeMap's dark style (free, no key). Loaded only when
// the visitor switches to the world view. Pins use the coarse (rounded + jittered) coordinates.
const STYLE = "https://tiles.openfreemap.org/styles/dark";

export default function WorldMap({ visitors }: { visitors: LiveVisitor[] }) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<maplibregl.Marker[]>([]);

  useEffect(() => {
    if (!box.current) return;
    map.current = new maplibregl.Map({
      container: box.current,
      style: STYLE,
      center: [100.5, 13.5],
      zoom: 1.6,
      attributionControl: { compact: true },
    });
    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    markers.current.forEach((mk) => mk.remove());
    markers.current = visitors
      .filter((v) => v.lat !== null && v.lng !== null)
      .slice(0, 300)
      .map((v) => {
        const el = document.createElement("img");
        el.src = avatarUri(v.id);
        el.alt = "";
        el.width = 22;
        el.height = 22;
        el.style.borderRadius = "9999px";
        el.style.border = "2px solid var(--brand)";
        return new maplibregl.Marker({ element: el })
          .setLngLat([v.lng!, v.lat!])
          .addTo(m);
      });
  }, [visitors]);

  return <div ref={box} className="size-full" />;
}
