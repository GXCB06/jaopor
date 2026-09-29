import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// AES-256-GCM envelope for payment-provider API keys (CLAUDE.md rule 4).
// Stored format: "v1.<iv>.<authTag>.<ciphertext>" (base64url parts).
const VERSION = "v1";

function loadKey(secretBase64: string): Buffer {
  const key = Buffer.from(secretBase64, "base64");
  if (key.length !== 32) {
    throw new Error("KEY_ENCRYPTION_SECRET must be 32 bytes, base64-encoded");
  }
  return key;
}

export function encryptSecret(plaintext: string, secretBase64: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", loadKey(secretBase64), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv, tag, ciphertext]
    .map((part) =>
      typeof part === "string" ? part : part.toString("base64url"),
    )
    .join(".");
}

export function decryptSecret(envelope: string, secretBase64: string): string {
  const [version, iv, tag, ciphertext] = envelope.split(".");
  if (version !== VERSION || !iv || !tag || !ciphertext) {
    throw new Error("Unrecognized encrypted key format");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    loadKey(secretBase64),
    Buffer.from(iv, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

/** Last 4 chars only, e.g. "…a1B2" — safe to store and show. */
export function keyHint(key: string): string {
  return `…${key.slice(-4)}`;
}
