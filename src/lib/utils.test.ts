import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn (Design.md §3 registrations)", () => {
  it("keeps the custom text steps next to a colour", () => {
    expect(cn("text-caption", "text-foreground")).toBe(
      "text-caption text-foreground",
    );
  });
  it("treats font-prose as a font family, not a weight", () => {
    expect(cn("font-prose", "font-bold")).toBe("font-prose font-bold");
    expect(cn("font-prose", "font-mono")).toBe("font-mono");
  });
});
