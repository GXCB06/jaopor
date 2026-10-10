import { describe, expect, it } from "vitest";
import { analyticsEnabled, gaInitScript, gaMeasurementId } from "./ga";

describe("gaMeasurementId", () => {
  it("is off when the var is unset (no built-in default)", () => {
    expect(gaMeasurementId(undefined)).toBeNull();
  });

  it("uses an override and trims whitespace", () => {
    expect(gaMeasurementId("  G-ABC123  ")).toBe("G-ABC123");
  });

  it("treats empty or opt-out values as disabled", () => {
    expect(gaMeasurementId("")).toBeNull();
    expect(gaMeasurementId("   ")).toBeNull();
    expect(gaMeasurementId("off")).toBeNull();
    expect(gaMeasurementId("false")).toBeNull();
  });
});

describe("analyticsEnabled", () => {
  it("is on in production only when an id is set", () => {
    expect(analyticsEnabled("production", "G-ABC123")).toBe(true);
  });

  it("stays off when unset, outside production (dev, test), or disabled", () => {
    expect(analyticsEnabled("production", undefined)).toBe(false);
    expect(analyticsEnabled("development", "G-ABC123")).toBe(false);
    expect(analyticsEnabled("test", "G-ABC123")).toBe(false);
    expect(analyticsEnabled("production", "off")).toBe(false);
  });
});

describe("gaInitScript", () => {
  it("boots dataLayer, defines gtag and configures the id", () => {
    const s = gaInitScript("G-ABC123");
    expect(s).toContain("window.dataLayer=window.dataLayer||[]");
    expect(s).toContain("function gtag(){dataLayer.push(arguments)}");
    expect(s).toContain('gtag("js",new Date())');
    expect(s).toContain('gtag("config","G-ABC123")');
  });
});
