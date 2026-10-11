import { describe, expect, it } from "vitest";
import { LIST_MAX, asList, joinList, parseList } from "./url-list";

const ok = (x: string) => ["a", "b", "c"].includes(x);

describe("parseList", () => {
  it("reads commas and repeated params, drops unknown and duplicate values", () => {
    expect(parseList("a,x,b", ok)).toEqual(["a", "b"]);
    expect(parseList(["b", "a,b", " c "], ok)).toEqual(["b", "a", "c"]);
    expect(parseList(undefined, ok)).toEqual([]);
    expect(parseList("", ok)).toEqual([]);
  });

  it(`keeps at most ${LIST_MAX} values`, () => {
    const many = Array.from({ length: 40 }, (_, i) => `v${i}`).join(",");
    expect(parseList(many, () => true)).toHaveLength(LIST_MAX);
  });
});

describe("joinList / asList", () => {
  it("joins with commas, empty → undefined", () => {
    expect(joinList(["a", "b"])).toBe("a,b");
    expect(joinList([])).toBeUndefined();
    expect(joinList(undefined)).toBeUndefined();
  });

  it("wraps a single value", () => {
    expect(asList("a")).toEqual(["a"]);
    expect(asList(["a", "b"])).toEqual(["a", "b"]);
    expect(asList(undefined)).toEqual([]);
  });
});
