import { describe, expect, it } from "vitest";
import { REGION_PATH } from "@/components/olympics/ThailandMap";
import { PROVINCE_LIST as PROVINCES } from "./provinces";
import { PROVINCE_POINT_SLUGS, provincePoint } from "./province-points";

/** The map paths are absolute M / L / Z polygons: parse them into points. */
function polygon(d: string): [number, number][] {
  return [...d.matchAll(/[ML]\s*([\d.]+)[ ,]([\d.]+)/g)].map((m) => [
    Number(m[1]),
    Number(m[2]),
  ]);
}

/** Even-odd ray casting. */
function inside(x: number, y: number, poly: [number, number][]): boolean {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)
      hit = !hit;
  }
  return hit;
}

describe("province points on the badge map", () => {
  it("cover exactly the 77 provinces", () => {
    expect(new Set(PROVINCE_POINT_SLUGS)).toEqual(
      new Set(PROVINCES.map((p) => p.slug)),
    );
  });

  it("each lies inside its own region's outline", () => {
    const outside = PROVINCES.filter((p) => {
      const pt = provincePoint(p.slug)!;
      return !inside(pt.x, pt.y, polygon(REGION_PATH[p.region]));
    }).map((p) => `${p.slug} ${JSON.stringify(provincePoint(p.slug))}`);
    expect(outside).toEqual([]);
  });
});
