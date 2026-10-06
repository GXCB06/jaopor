import "server-only";
import { lookup as dnsLookup, type LookupAddress } from "node:dns";
import { request } from "node:https";
import type { IncomingMessage } from "node:http";
import { isIP, type LookupFunction } from "node:net";
import { Readable, Transform, pipeline } from "node:stream";
import { createBrotliDecompress, createGunzip, createInflate } from "node:zlib";

// Guard for every server-side fetch of a user-supplied URL (Umami share links, link previews,
// the Add-startup auto-fill, the Owner-verified snippet check). Without it a user could make our
// server call internal addresses (SSRF): cloud metadata, localhost, private networks.
//
// - Every hop (first URL and each redirect): https only, port 443, no user:password@, no IP
//   literals (any numeric form: new URL() normalises 0x7f.1 / 2130706433 to 127.0.0.1), a dotted
//   name that isn't a local suffix.
// - The IP is checked inside the socket's own DNS lookup, so the address we check is the address
//   we connect to (no gap for DNS rebinding between a check and the request).
// - Redirects are followed manually and re-checked, at most `maxRedirects` (0 = refused).
// - The body is capped after decompression (`maxBytes`), and the whole request has a deadline.

const BLOCKED_SUFFIXES = [
  ".local",
  ".localhost",
  ".internal",
  ".lan",
  ".home",
  ".arpa",
];

function v4Private(ip: string): boolean {
  const [a, b, c] = ip.split(".").map(Number);
  return (
    a === 0 || // "this" network
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) || // carrier-grade NAT
    (a === 169 && b === 254) || // link-local incl. cloud metadata
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && (c === 0 || c === 2)) || // IETF protocol / TEST-NET-1
    (a === 192 && b === 88 && c === 99) || // 6to4 relay anycast
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) || // benchmarking
    (a === 198 && b === 51 && c === 100) || // TEST-NET-2
    (a === 203 && b === 0 && c === 113) || // TEST-NET-3
    a >= 224 // multicast, reserved, broadcast
  );
}

/** Expands an IPv6 address to 8 groups of 16 bits (null if it isn't one). */
function v6Groups(ip: string): number[] | null {
  let s = ip.toLowerCase().split("%")[0];
  // Trailing dotted IPv4 (::ffff:1.2.3.4) → two hex groups.
  const dotted = /(\d+\.\d+\.\d+\.\d+)$/.exec(s);
  if (dotted) {
    if (isIP(dotted[1]) !== 4) return null;
    const [a, b, c, d] = dotted[1].split(".").map(Number);
    s = `${s.slice(0, -dotted[1].length)}${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`;
  }
  const [head, tail] = s.split("::");
  const h = head ? head.split(":") : [];
  const t = tail !== undefined && tail ? tail.split(":") : [];
  const fill = s.includes("::") ? 8 - h.length - t.length : 0;
  const groups = [...h, ...Array(Math.max(fill, 0)).fill("0"), ...t].map((g) =>
    parseInt(g, 16),
  );
  return groups.length === 8 && groups.every((g) => g >= 0 && g <= 0xffff)
    ? groups
    : null;
}

export function isPrivateAddress(ip: string): boolean {
  if (isIP(ip) === 4) return v4Private(ip);
  if (isIP(ip) !== 6) return true; // not an IP at all: never connect
  const g = v6Groups(ip);
  if (!g) return true;
  const v4 = (hi: number, lo: number) =>
    `${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`;
  if (g.slice(0, 7).every((x) => x === 0)) return true; // :: and ::1
  // IPv4-mapped (::ffff:a.b.c.d), IPv4-compatible (::a.b.c.d), NAT64 (64:ff9b::a.b.c.d)
  if (g.slice(0, 5).every((x) => x === 0) && (g[5] === 0xffff || g[5] === 0))
    return v4Private(v4(g[6], g[7]));
  if (g[0] === 0x64 && g[1] === 0xff9b) return v4Private(v4(g[6], g[7]));
  if (g[0] === 0x2002) return v4Private(v4(g[1], g[2])); // 6to4
  return (
    (g[0] & 0xfe00) === 0xfc00 || // unique local fc00::/7
    (g[0] & 0xffc0) === 0xfe80 || // link-local fe80::/10
    (g[0] & 0xffc0) === 0xfec0 || // site-local (deprecated) fec0::/10
    (g[0] & 0xff00) === 0xff00 || // multicast
    (g[0] === 0x2001 && g[1] === 0x0db8) || // documentation
    (g[0] === 0x0100 && g[1] === 0 && g[2] === 0 && g[3] === 0) // discard-only
  );
}

/** The URL rules every hop must pass (no DNS). Throws "invalid_url" / "blocked_url". */
export function assertSafeUrl(raw: string | URL): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("invalid_url");
  }
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    (url.port && url.port !== "443") ||
    isIP(host.replace(/^\[|\]$/g, "")) !== 0 ||
    !host.includes(".") ||
    BLOCKED_SUFFIXES.some((s) => host.endsWith(s)) ||
    host === "localhost"
  )
    throw new Error("blocked_url");
  return url;
}

type Resolver = (
  hostname: string,
  cb: (err: Error | null, addresses: LookupAddress[]) => void,
) => void;

const systemResolver: Resolver = (hostname, cb) =>
  dnsLookup(hostname, { all: true, verbatim: true }, cb);

/**
 * The socket's DNS lookup: refuses the connection when any address the name resolves to is
 * private. Used by the connection itself, so the checked address is the one connected to.
 */
export function guardedLookup(
  resolve: Resolver = systemResolver,
): LookupFunction {
  return ((hostname, options, callback) => {
    resolve(hostname, (err, addresses) => {
      if (err) return callback(err, "", 4);
      const family = (options as { family?: number }).family;
      const usable = addresses.filter(
        (a) => !family || family === 0 || a.family === family,
      );
      if (
        !usable.length ||
        addresses.some((a) => isPrivateAddress(a.address))
      ) {
        const blocked = Object.assign(new Error("blocked_url"), {
          code: "EBLOCKED",
        });
        return callback(blocked, "", 4);
      }
      if ((options as { all?: boolean }).all)
        return (callback as unknown as (e: null, a: LookupAddress[]) => void)(
          null,
          usable,
        );
      callback(null, usable[0].address, usable[0].family);
    });
  }) as LookupFunction;
}

/** Errors once more than `max` bytes pass through. */
function capBytes(max: number): Transform {
  let seen = 0;
  return new Transform({
    transform(chunk: Buffer, _enc, done) {
      seen += chunk.length;
      if (seen > max) done(new Error("too_large"));
      else done(null, chunk);
    },
  });
}

/**
 * Body stream: decompressed when the server compressed it, then capped. pipeline() tears every
 * stage down together, so a timeout, a cap overrun or a cancelled reader closes the socket and
 * errors the stream instead of leaving a reader waiting.
 */
function body(res: IncomingMessage, maxBytes: number): Readable {
  const enc = (res.headers["content-encoding"] ?? "identity")
    .toString()
    .trim()
    .toLowerCase();
  const cap = capBytes(maxBytes);
  const done = () => {};
  if (enc === "gzip" || enc === "x-gzip")
    return pipeline(res, createGunzip(), cap, done);
  if (enc === "deflate") return pipeline(res, createInflate(), cap, done);
  if (enc === "br") return pipeline(res, createBrotliDecompress(), cap, done);
  return pipeline(res, cap, done);
}

function once(
  url: URL,
  init: { headers?: Record<string, string>; signal: AbortSignal },
  lookup: LookupFunction,
): Promise<IncomingMessage> {
  return new Promise((resolve, reject) => {
    const req = request(url, {
      method: "GET",
      headers: { "accept-encoding": "gzip, deflate, br", ...init.headers },
      lookup,
      agent: false, // a fresh socket per request: no reuse of an earlier lookup
      signal: init.signal,
    });
    req.on("response", resolve);
    req.on("error", reject);
    req.end();
  });
}

export type GuardedOptions = {
  headers?: Record<string, string>;
  /** Redirects to follow (each re-checked); 0 refuses any redirect. */
  maxRedirects?: number;
  /** Body cap after decompression; reading past it errors. */
  maxBytes?: number;
  /** Deadline for the whole request, redirects and body included. */
  timeoutMs?: number;
  signal?: AbortSignal;
  /** Tests only: a fake DNS resolver. */
  resolver?: Resolver;
};

/** GET a user-supplied URL under the rules above. Returns the final URL and a web Response. */
export async function guardedGet(
  raw: string,
  opts: GuardedOptions = {},
): Promise<{ response: Response; url: URL }> {
  const maxRedirects = opts.maxRedirects ?? 0;
  const deadline = AbortSignal.timeout(opts.timeoutMs ?? 10_000);
  const signal = opts.signal
    ? AbortSignal.any([opts.signal, deadline])
    : deadline;
  const lookup = guardedLookup(opts.resolver);
  let url = assertSafeUrl(raw);
  for (let hop = 0; ; hop++) {
    const res = await once(url, { headers: opts.headers, signal }, lookup);
    const status = res.statusCode ?? 0;
    if (status >= 300 && status < 400 && res.headers.location) {
      res.resume();
      if (hop >= maxRedirects) throw new Error("redirect_refused");
      url = assertSafeUrl(new URL(res.headers.location, url));
      continue;
    }
    const headers = new Headers();
    for (const [k, v] of Object.entries(res.headers))
      if (v !== undefined && k !== "content-encoding" && k !== "content-length")
        headers.set(k, Array.isArray(v) ? v.join(", ") : v);
    const nullBody = status === 204 || status === 205 || status === 304;
    if (nullBody) res.resume();
    const stream = nullBody
      ? null
      : (Readable.toWeb(
          body(res, opts.maxBytes ?? 2 * 1024 * 1024),
        ) as ReadableStream<Uint8Array>);
    return {
      response: new Response(stream, {
        status: status >= 200 && status <= 599 ? status : 502,
        headers,
      }),
      url,
    };
  }
}

/** fetch() for founder-supplied URLs (Umami): guarded, no redirects, 10 s, 2 MB. */
export async function fetchPublic(
  raw: string | URL,
  init: RequestInit = {},
): Promise<Response> {
  const headers = Object.fromEntries(new Headers(init.headers).entries());
  const { response } = await guardedGet(raw.toString(), {
    headers,
    maxRedirects: 0,
    timeoutMs: 10_000,
    signal: init.signal ?? undefined,
  });
  return response;
}

/** Kept for callers that only need the URL rules plus a DNS pre-check (no request made). */
export async function assertPublicHttpsUrl(raw: string): Promise<URL> {
  const url = assertSafeUrl(raw);
  const addresses = await new Promise<LookupAddress[]>((resolve, reject) =>
    systemResolver(url.hostname, (err, a) => (err ? reject(err) : resolve(a))),
  );
  if (!addresses.length || addresses.some((a) => isPrivateAddress(a.address)))
    throw new Error("blocked_url");
  return url;
}
