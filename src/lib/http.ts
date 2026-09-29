import "server-only";
import { timingSafeEqual } from "node:crypto";

/** Constant-time string compare (for bearer secrets). */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/**
 * CSRF guard for cookie-authenticated JSON POSTs: require a JSON body and a same-origin request.
 * Cross-site forms can't send application/json without a CORS preflight, and browsers always
 * send Origin on cross-origin POSTs.
 */
export function isSameOriginJson(req: Request): boolean {
  if (
    !req.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json")
  )
    return false;
  const origin = req.headers.get("origin");
  if (!origin) return true; // same-origin navigations from some browsers omit Origin
  try {
    return new URL(origin).host === new URL(req.url).host;
  } catch {
    return false;
  }
}

export function json(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
