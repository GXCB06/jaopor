import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

// Guard for server-side fetches of founder-supplied URLs (e.g. a self-hosted Umami share link).
// Without it a founder could make our server call internal addresses (SSRF): cloud metadata
// endpoints, localhost, private networks. HTTPS + public DNS names only, and no redirects.

const BLOCKED_SUFFIXES = [".local", ".localhost", ".internal", ".lan", ".home"];

export function isPrivateAddress(ip: string): boolean {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) || // carrier-grade NAT
      (a === 169 && b === 254) || // link-local incl. cloud metadata
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a >= 224 // multicast + reserved
    );
  }
  const v6 = ip.toLowerCase();
  if (v6.startsWith("::ffff:")) return isPrivateAddress(v6.slice(7));
  return (
    v6 === "::" ||
    v6 === "::1" ||
    v6.startsWith("fc") ||
    v6.startsWith("fd") ||
    v6.startsWith("fe80")
  );
}

/** Throws unless `raw` is an https URL on a public DNS name that resolves only to public IPs. */
export async function assertPublicHttpsUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("invalid_url");
  }
  const host = url.hostname.toLowerCase();
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    (url.port && url.port !== "443") ||
    isIP(host.replace(/^\[|\]$/g, "")) !== 0 ||
    !host.includes(".") ||
    BLOCKED_SUFFIXES.some((s) => host.endsWith(s))
  ) {
    throw new Error("blocked_url");
  }
  const addresses = await lookup(host, { all: true });
  if (!addresses.length || addresses.some((a) => isPrivateAddress(a.address)))
    throw new Error("blocked_url");
  return url;
}

/** fetch() for founder-supplied URLs: public https only, never follows redirects, 10 s timeout. */
export async function fetchPublic(
  raw: string,
  init: RequestInit = {},
): Promise<Response> {
  const url = await assertPublicHttpsUrl(raw);
  return fetch(url, {
    ...init,
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
  });
}
