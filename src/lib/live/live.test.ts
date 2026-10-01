import { describe, expect, it } from "vitest";
import { coarse, coarseGeo, nearestProvince } from "./geo";
import {
  ANIMALS,
  COLORS,
  isIdentity,
  pageSection,
  parseVisitor,
  visitorName,
} from "./identity";

const ID = "1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed";

describe("identity", () => {
  it("names come only from the word lists, per locale", () => {
    expect(visitorName({ c: 0, a: 0 }, "en")).toBe("Blue Elephant");
    expect(visitorName({ c: 0, a: 0 }, "th")).toBe("ช้างสีฟ้า");
    expect(COLORS.length * ANIMALS.length).toBeGreaterThan(200);
  });

  it("rejects malformed identities", () => {
    expect(isIdentity({ id: ID, c: 1, a: 2 })).toBe(true);
    expect(isIdentity({ id: "x", c: 1, a: 2 })).toBe(false);
    expect(isIdentity({ id: ID, c: 99, a: 2 })).toBe(false);
    expect(isIdentity({ id: ID, c: 1.5, a: 2 })).toBe(false);
  });
});

describe("parseVisitor (untrusted presence payloads)", () => {
  it("keeps valid fields and drops the rest", () => {
    expect(
      parseVisitor({
        id: ID,
        c: 1,
        a: 2,
        path: "/th/olympics",
        country: "TH",
        province: "mukdahan",
        lat: 16.54321,
        lng: 104.7,
        device: "mobile",
        extra: "<script>",
      }),
    ).toEqual({
      id: ID,
      c: 1,
      a: 2,
      path: "/th/olympics",
      country: "TH",
      province: "mukdahan",
      lat: 16.54,
      lng: 104.7,
      device: "mobile",
    });
  });

  it("nulls out bad location, refuses bad paths", () => {
    expect(
      parseVisitor({
        id: ID,
        c: 1,
        a: 2,
        path: "/th",
        country: "thailand",
        province: "atlantis",
        lat: 999,
        lng: 10,
      }),
    ).toMatchObject({
      country: null,
      province: null,
      lat: null,
      lng: null,
      device: "desktop",
    });
    expect(
      parseVisitor({ id: ID, c: 1, a: 2, path: "javascript:alert(1)" }),
    ).toBeNull();
    expect(parseVisitor({ id: ID, c: 1, a: 2, path: "/th/<b>" })).toBeNull();
  });

  it("maps paths to fixed sections", () => {
    expect(pageSection("/th")).toBe("home");
    expect(pageSection("/en/startup/some-slug")).toBe("startup");
    expect(pageSection("/th/category/ai")).toBe("category");
    expect(pageSection("/th/u/someone")).toBe("other");
  });
});

describe("geo", () => {
  it("rounds to 1 decimal with at most ±0.05 jitter", () => {
    expect(coarse(13.7563, () => 0.5)).toBe(13.8);
    expect(coarse(13.7563, () => 0)).toBe(13.75);
    expect(coarse(13.7563, () => 0.999)).toBeCloseTo(13.85, 2);
  });

  it("finds the nearest province centre", () => {
    expect(nearestProvince(13.75, 100.5)).toBe("bangkok");
    expect(nearestProvince(18.8, 98.95)).toBe("chiang-mai");
    expect(nearestProvince(7.9, 98.35)).toBe("phuket");
  });

  it("only maps Thai visitors to provinces", () => {
    expect(
      coarseGeo(
        { country: "TH", latitude: "16.55", longitude: "104.7" },
        () => 0.5,
      ),
    ).toEqual({ country: "TH", province: "mukdahan", lat: 16.6, lng: 104.7 });
    expect(
      coarseGeo(
        { country: "JP", latitude: "35.68", longitude: "139.69" },
        () => 0.5,
      ),
    ).toEqual({ country: "JP", province: null, lat: 35.7, lng: 139.7 });
    expect(coarseGeo({})).toEqual({
      country: null,
      province: null,
      lat: null,
      lng: null,
    });
  });
});
