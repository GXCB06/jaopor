import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret, keyHint } from "./keys";

const secret = randomBytes(32).toString("base64");

describe("key encryption", () => {
  it("round-trips and never stores the plaintext", () => {
    const key = "rk_test_51AbCdEfGhIjKlMnOpQrStUv";
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
    expect(keyHint("rk_test_abcdefWXYZ")).toBe("…WXYZ");
  });
});
