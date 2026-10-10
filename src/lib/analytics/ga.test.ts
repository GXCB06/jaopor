import { describe, expect, it } from "vitest";
import {
  analyticsEnabled,
  DEFAULT_MEASUREMENT_ID,
  gaInitScript,
  gaMeasurementId,
} from "./ga";

describe("gaMeasurementId", () => {
  it("falls back to JaoPor's default when unset", () => {
    expect(gaMeasurementId(undefined)).toBe("G-JYPJ2RFH4N");
    expect(gaMeasurementId(undefined)).toBe(DEFAULT_MEASUREMENT_ID);
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
  it("is on in production with an id, and on by default when unset", () => {
    expect(analyticsEnabled("production", "G-ABC123")).toBe(true);
    expect(analyticsEnabled("production", undefined)).toBe(true);
  });

  it("stays off outside production (dev, test) or when disabled", () => {
    expect(analyticsEnabled("development", "G-ABC123")).toBe(false);
    expect(analyticsEnabled("development", undefined)).toBe(false);
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
