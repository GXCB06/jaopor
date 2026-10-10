import { describe, expect, it } from "vitest";
import { contactPath, isRequestTopic, lookingForActions } from "./looking-for";

const base = { founderHandle: "gxcb06", productUrl: "https://jaopor.app" };

describe("lookingForActions", () => {
  it("co-founder opens a co-founder request to the founder, never the product site", () => {
    expect(lookingForActions(["cofounder"], base)).toEqual([
      {
        kind: "contact",
        topic: "cofounder",
        href: "/u/gxcb06?contact=1&topic=cofounder",
      },
    ]);
  });

  it("investor or buyer opens a general request", () => {
    expect(lookingForActions(["investor"], base)[0]).toMatchObject({
      kind: "contact",
      topic: "other",
    });
    expect(lookingForActions(["buyer"], base)[0]).toMatchObject({
      topic: "other",
    });
  });

  it("product asks open the product; mixed asks give both actions, contact first", () => {
    expect(lookingForActions(["users", "feedback"], base)).toEqual([
      { kind: "try", href: "https://jaopor.app" },
    ]);
    expect(
      lookingForActions(["users", "cofounder"], base).map((a) => a.kind),
    ).toEqual(["contact", "try"]);
  });

  it("one contact action even when several people asks are listed", () => {
    const actions = lookingForActions(["cofounder", "investor"], base);
    expect(actions.filter((a) => a.kind === "contact")).toHaveLength(1);
    expect(actions[0]).toMatchObject({ topic: "cofounder" });
  });

  it("no founder handle → no contact action; no product link → no try action", () => {
    expect(
      lookingForActions(["cofounder"], { ...base, founderHandle: null }),
    ).toEqual([]);
    expect(lookingForActions(["users"], { ...base, productUrl: null })).toEqual(
      [],
    );
  });

  it("ignores unknown asks", () => {
    expect(lookingForActions(["nonsense"], base)).toEqual([]);
  });
});

describe("contactPath / isRequestTopic", () => {
  it("encodes the handle", () => {
    expect(contactPath("a b", "cofounder")).toBe(
      "/u/a%20b?contact=1&topic=cofounder",
    );
  });
  it("accepts only the database topics", () => {
    for (const ok of ["cofounder", "job", "collab", "other"])
      expect(isRequestTopic(ok)).toBe(true);
    for (const bad of ["investor", "", null, undefined, ["cofounder"]])
      expect(isRequestTopic(bad)).toBe(false);
  });
});
