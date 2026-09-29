import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret, keyHint, parseKeySecret } from "./keys";

const secret = randomBytes(32).toString("base64");

describe("key encryption", () => {
  it("round-trips and never stores the plaintext", () => {
    // Built at runtime so no key-shaped literal lands in git (keeps secret scanners quiet).
    const key = ["rk", "test", "FAKE0000000000000000"].join("_");
    const envelope = encryptSecret(key, secret);
    expect(envelope.startsWith("v1.")).toBe(true);
    expect(envelope).not.toContain(key);
    expect(decryptSecret(envelope, secret)).toBe(key);
  });

  it("uses a fresh IV every time", () => {
    expect(encryptSecret("same", secret)).not.toBe(
      encryptSecret("same", secret),
    );
  });

  it("rejects tampered ciphertext and the wrong secret", () => {
    const envelope = encryptSecret("rk_test_x", secret);
    const parts = envelope.split(".");
    parts[3] = Buffer.from("tampered").toString("base64url");
    expect(() => decryptSecret(parts.join("."), secret)).toThrow();
    expect(() =>
      decryptSecret(envelope, randomBytes(32).toString("base64")),
    ).toThrow();
  });

  it("requires a 32-byte secret", () => {
    expect(() =>
      encryptSecret("x", Buffer.from("short").toString("base64")),
    ).toThrow(/32 bytes/);
  });

  it("shows only the last 4 characters as a hint", () => {
    expect(keyHint("anything-WXYZ")).toBe("…WXYZ");
  });
});

describe("parseKeySecret (KEY_ENCRYPTION_SECRET formats)", () => {
  const raw = randomBytes(32);

  it("accepts base64, base64url and 64 hex chars, all to the same 32 bytes", () => {
    expect(parseKeySecret(raw.toString("base64"))?.equals(raw)).toBe(true);
    expect(parseKeySecret(raw.toString("base64url"))?.equals(raw)).toBe(true);
    expect(parseKeySecret(raw.toString("hex"))?.equals(raw)).toBe(true);
    expect(parseKeySecret(raw.toString("hex").toUpperCase())?.equals(raw)).toBe(
      true,
    );
  });

  it("ignores surrounding whitespace and quotes pasted from a terminal", () => {
    expect(parseKeySecret(`  "${raw.toString("base64")}"\n`)?.equals(raw)).toBe(
      true,
    );
  });

  it("rejects wrong lengths and non-key text", () => {
    expect(parseKeySecret(undefined)).toBeNull();
    expect(parseKeySecret("")).toBeNull();
    expect(parseKeySecret(randomBytes(16).toString("base64"))).toBeNull();
    expect(parseKeySecret(randomBytes(48).toString("base64"))).toBeNull();
    expect(parseKeySecret("my super secret password")).toBeNull();
  });

  it("encrypts with a hex secret too", () => {
    const hex = raw.toString("hex");
    expect(decryptSecret(encryptSecret("hello", hex), hex)).toBe("hello");
  });
});
