import { describe, expect, it } from "vitest";
import type { LookupAddress } from "node:dns";
import {
  assertPublicHttpsUrl,
  assertSafeUrl,
  guardedGet,
  guardedLookup,
  isPrivateAddress,
} from "./public-url";

describe("isPrivateAddress", () => {
  it.each([
    "127.0.0.1",
    "127.255.255.254",
    "10.1.2.3",
    "172.20.0.1",
    "192.168.1.1",
    "169.254.169.254", // cloud metadata
    "100.64.0.1",
    "0.0.0.0",
    "192.0.0.8",
    "192.0.2.1",
    "198.18.0.1",
    "198.51.100.7",
    "203.0.113.9",
    "224.0.0.1",
    "255.255.255.255",
    "::",
    "::1",
    "fd00::1",
    "fc00::1",
    "fe80::1",
    "febf::1", // still link-local (fe80::/10)
    "fec0::1",
    "ff02::1",
    "::ffff:127.0.0.1",
    "::ffff:7f00:1", // the same, in hex
    "::ffff:169.254.169.254",
    "::127.0.0.1", // IPv4-compatible
    "64:ff9b::a9fe:a9fe", // NAT64 of 169.254.169.254
    "2002:7f00:1::1", // 6to4 of 127.0.0.1
    "2001:db8::1",
    "fe80::1%eth0",
    "not-an-ip",
    "",
  ])("%s is refused", (ip) => expect(isPrivateAddress(ip)).toBe(true));

  it.each([
    "8.8.8.8",
    "1.1.1.1",
    "172.32.0.1",
    "100.128.0.1",
    "2606:4700::1111",
    "2a00:1450:4001::200e",
    "::ffff:8.8.8.8",
  ])("%s is public", (ip) => expect(isPrivateAddress(ip)).toBe(false));
});

describe("assertSafeUrl: every hop's URL rules (no DNS)", () => {
  it.each([
    ["http (no TLS)", "http://example.com/"],
    ["file scheme", "file:///etc/passwd"],
    ["ftp scheme", "ftp://example.com/"],
    ["gopher scheme", "gopher://example.com/"],
    ["data URL", "data:text/html,<p>x</p>"],
    ["javascript URL", "javascript:alert(1)"],
    ["IPv4 literal", "https://127.0.0.1/"],
    ["metadata IP", "https://169.254.169.254/latest/meta-data/"],
    ["decimal IP", "https://2130706433/"],
    ["hex IP", "https://0x7f.1/"],
    ["octal IP", "https://0177.0.0.1/"],
    ["short IP", "https://127.1/"],
    ["IPv6 loopback", "https://[::1]/"],
    ["IPv4-mapped IPv6", "https://[::ffff:127.0.0.1]/"],
    ["localhost", "https://localhost/"],
    ["localhost with dot", "https://localhost./"],
    ["*.localhost", "https://app.localhost/"],
    ["single label", "https://metadata/"],
    ["*.internal", "https://metadata.google.internal/"],
    ["*.local", "https://printer.local/"],
    ["reverse DNS zone", "https://1.0.0.127.in-addr.arpa/"],
    ["other port", "https://example.com:8443/"],
    ["port 80 on https", "https://example.com:80/"],
    ["credentials", "https://user:pw@example.com/"],
    ["malformed", "not a url"],
    ["empty", ""],
  ])("blocks %s", (_name, url) =>
    expect(() => assertSafeUrl(url)).toThrow(/blocked_url|invalid_url/),
  );

  it("allows a plain public https URL (port 443 explicit or not)", () => {
    expect(assertSafeUrl("https://example.com/a?b=1").hostname).toBe(
      "example.com",
    );
    expect(assertSafeUrl("https://example.com:443/").port).toBe("");
  });
});

// A fake DNS: the request path below is the real one (node:https with our lookup); only the
// resolver answers are scripted, so nothing leaves this machine.
const fakeDns =
  (answers: Record<string, string[] | string[][]>) =>
  (host: string, cb: (e: Error | null, a: LookupAddress[]) => void) => {
    const entry = answers[host];
    if (!entry) return cb(new Error("ENOTFOUND"), []);
    // A list of lists = a different answer on each lookup (DNS rebinding).
    const list = Array.isArray(entry[0])
      ? ((entry as string[][]).shift() ?? [])
      : (entry as string[]);
    cb(
      null,
      list.map((address) => ({
        address,
        family: address.includes(":") ? 6 : 4,
      })),
    );
  };

describe("guardedLookup / guardedGet: the IP is checked at connect time", () => {
  it("refuses a name that resolves to a private address", async () => {
    await expect(
      guardedGet("https://inside.example.com/", {
        resolver: fakeDns({ "inside.example.com": ["10.0.0.5"] }),
        timeoutMs: 2000,
      }),
    ).rejects.toThrow(/blocked_url/);
  });

  it("refuses when any one of several addresses is private", async () => {
    await expect(
      guardedGet("https://mixed.example.com/", {
        resolver: fakeDns({
          "mixed.example.com": ["93.184.216.34", "169.254.169.254"],
        }),
        timeoutMs: 2000,
      }),
    ).rejects.toThrow(/blocked_url/);
  });

  it("refuses IPv6 loopback and IPv4-mapped metadata from DNS", async () => {
    for (const ip of ["::1", "::ffff:169.254.169.254", "fd12::1"])
      await expect(
        guardedGet("https://v6.example.com/", {
          resolver: fakeDns({ "v6.example.com": [ip] }),
          timeoutMs: 2000,
        }),
      ).rejects.toThrow(/blocked_url/);
  });

  it("DNS rebinding: a public first answer doesn't help, the connection's own lookup is checked", () => {
    const lookup = guardedLookup(
      fakeDns({ "rebind.example.com": [["93.184.216.34"], ["127.0.0.1"]] }),
    );
    const results: string[] = [];
    const call = () =>
      new Promise<void>((resolve) =>
        lookup("rebind.example.com", { all: true }, (err) => {
          results.push(err ? err.message : "ok");
          resolve();
        }),
      );
    return call()
      .then(call)
      .then(() => expect(results).toEqual(["ok", "blocked_url"]));
  });

  it("an http:// or IP-literal URL never reaches DNS", async () => {
    let asked = false;
    const resolver = (
      _h: string,
      cb: (e: Error | null, a: LookupAddress[]) => void,
    ) => {
      asked = true;
      cb(null, [{ address: "93.184.216.34", family: 4 }]);
    };
    await expect(
      guardedGet("http://example.com/", { resolver }),
    ).rejects.toThrow(/blocked_url/);
    await expect(
      guardedGet("https://169.254.169.254/", { resolver }),
    ).rejects.toThrow(/blocked_url/);
    expect(asked).toBe(false);
  });
});

describe("assertPublicHttpsUrl (rules + DNS pre-check)", () => {
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
