import { describe, expect, it } from "vitest";
import { typeFilter } from "./startups";

describe("typeFilter (directory project type, any of)", () => {
  it("app means either store; several types are OR-ed", () => {
    expect(typeFilter(["website"])).toBe("website_url.not.is.null");
    expect(typeFilter(["app", "line"])).toBe(
      "app_store_url.not.is.null,play_store_url.not.is.null,line_url.not.is.null",
    );
  });
});
