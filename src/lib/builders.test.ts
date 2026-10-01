import { describe, expect, it } from "vitest";
import {
  filterBuilders,
  orderSkills,
  searchBuilders,
  sortBuilders,
  type DirectoryBuilder,
} from "./builders";

const b = (over: Partial<DirectoryBuilder>): DirectoryBuilder => ({
  id: over.handle ?? "x",
  handle: "x",
  name: "X",
  avatarUrl: null,
  headline: null,
  status: "networking",
  province: null,
  skills: [],
  tools: [],
  works: 0,
  verifiedWorks: 0,
  mrrCents: 0,
  createdAt: "2026-09-01T00:00:00Z",
  ...over,
});

const list = [
  b({
    handle: "somchai",
    name: "Somchai Dev",
    headline: "Full-stack",
    province: "chiang-mai",
    status: "looking_cofounder",
    skills: [{ slug: "fullstack", superpower: true }],
    tools: ["claude-code"],
    works: 2,
    verifiedWorks: 1,
    mrrCents: 50_000,
  }),
  b({
    handle: "nok",
    name: "Nok",
    headline: "Designer ที่ cu109",
    province: "bangkok",
    skills: [{ slug: "ui-design", superpower: false }],
    tools: ["cursor"],
    works: 1,
  }),
  b({ handle: "hidden_prov", name: "Anon", createdAt: "2026-09-20T00:00:00Z" }),
];
const regionOf = (p: string) =>
  ({ "chiang-mai": "north", bangkok: "central" })[p] as never;

describe("builders directory", () => {
  it("filters by each facet and combines them", () => {
    const f = (x: Parameters<typeof filterBuilders>[1]) =>
      filterBuilders(list, x, regionOf).map((r) => r.handle);
    expect(f({})).toHaveLength(3);
    expect(f({ skill: "fullstack" })).toEqual(["somchai"]);
    expect(f({ province: "bangkok" })).toEqual(["nok"]);
    expect(f({ region: "north" })).toEqual(["somchai"]);
    expect(f({ status: "looking_cofounder" })).toEqual(["somchai"]);
    expect(f({ tool: "cursor" })).toEqual(["nok"]);
    expect(f({ verified: true })).toEqual(["somchai"]);
    expect(f({ q: "@NOK" })).toEqual(["nok"]);
    expect(f({ q: "cu109" })).toEqual(["nok"]);
    expect(f({ region: "north", tool: "cursor" })).toEqual([]);
  });

  it("a hidden province never matches a province or region filter", () => {
    expect(
      filterBuilders(list, { region: "central" }, regionOf).map(
        (r) => r.handle,
      ),
    ).toEqual(["nok"]);
  });

  it("sorts by verified revenue, then works, then newest", () => {
    expect(sortBuilders(list).map((r) => r.handle)).toEqual([
      "somchai",
      "nok",
      "hidden_prov",
    ]);
  });

  it("orders superpowers first, then by position", () => {
    expect(
      orderSkills([
        { skill_slug: "a", is_superpower: false, position: 0 },
        { skill_slug: "b", is_superpower: true, position: 2 },
        { skill_slug: "c", is_superpower: true, position: 1 },
      ]).map((s) => s.slug),
    ).toEqual(["c", "b", "a"]);
  });

  it("search ranks handle prefixes first and ignores empty queries", () => {
    expect(searchBuilders(list, "", 5)).toEqual([]);
    expect(searchBuilders(list, "no", 5).map((r) => r.handle)).toEqual([
      "nok",
      "hidden_prov",
    ]);
    expect(searchBuilders(list, "dev", 5).map((r) => r.handle)).toEqual([
      "somchai",
    ]);
    expect(searchBuilders(list, "s", 1).map((r) => r.handle)).toEqual([
      "somchai",
    ]);
  });
});
