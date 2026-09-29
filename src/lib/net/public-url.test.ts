import { describe, expect, it } from "vitest";
import { assertPublicHttpsUrl, isPrivateAddress } from "./public-url";

describe("isPrivateAddress", () => {
  it.each([
    "127.0.0.1",
    "10.1.2.3",
    "172.20.0.1",
    "192.168.1.1",
    "169.254.169.254",
    "100.64.0.1",
    "0.0.0.0",
    "::1",
    "fd00::1",
    "fe80::1",
    "::ffff:127.0.0.1",
  ])("%s is private", (ip) => expect(isPrivateAddress(ip)).toBe(true));

  it.each(["8.8.8.8", "172.32.0.1", "1.1.1.1", "2606:4700::1111"])(
    "%s is public",
    (ip) => expect(isPrivateAddress(ip)).toBe(false),
  );
});

describe("assertPublicHttpsUrl (no DNS needed for these)", () => {
  it.each([
    "http://example.com/share/x",
    "https://127.0.0.1/share/x",
    "https://[::1]/x",
    "https://localhost/x",
    "https://stats.internal/x",
    "https://user:pw@example.com/x",
    "https://example.com:8443/x",
    "not a url",
  ])("blocks %s", async (url) => {
    await expect(assertPublicHttpsUrl(url)).rejects.toThrow();
  });
});
