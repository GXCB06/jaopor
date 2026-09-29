// Shared helpers for JaoPor (repo mrrmafia) Claude Code hooks (Node, cross-platform).
import fs from "node:fs";
import path from "node:path";

export const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd();

export async function readInput() {
  let raw = "";
  for await (const chunk of process.stdin) raw += chunk;
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** Project-relative, forward-slash path ("" when outside the project). */
export function relPath(p) {
  if (!p) return "";
  const rel = path.relative(PROJECT_DIR, path.resolve(PROJECT_DIR, p));
  if (rel.startsWith("..") || path.isAbsolute(rel)) return "";
  return rel.split(path.sep).join("/");
}

const SECRET_PATTERNS = [
  // Token patterns use non-capturing groups: a capture group 1 means "keep this prefix" in redact().
  /\b(?:sk|rk|pk)_(?:live|test)_[A-Za-z0-9]{8,}/g, // Stripe keys
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, // JWTs (Supabase keys)
  /\b(?:sbp|sb_secret|sb_publishable)_[A-Za-z0-9_]{10,}/g, // Supabase tokens
  /\bgh[pousr]_[A-Za-z0-9]{20,}/g, // GitHub tokens
  /\bsk-ant-[A-Za-z0-9_-]{10,}/g, // Anthropic keys
  /((?:api[_-]?key|secret|token|password|service[_-]?role)[A-Z_]*\s*[=:]\s*)["']?[^\s"']{6,}/gi,
];

export function redact(value) {
  if (typeof value !== "string") return value;
  let out = value;
  for (const re of SECRET_PATTERNS) {
    out = out.replace(re, (m, prefix) =>
      typeof prefix === "string" && m.startsWith(prefix)
        ? `${prefix}[REDACTED]`
        : "[REDACTED]",
    );
  }
  return out.length > 400 ? `${out.slice(0, 400)}…` : out;
}

/** Append one JSON line to .claude/logs/<date>/<session>.jsonl (observability layer). */
export function logEvent(sessionId, event) {
  try {
    const now = new Date();
    const day = now.toISOString().slice(0, 10);
    const dir = path.join(PROJECT_DIR, ".claude", "logs", day);
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${sessionId || "unknown-session"}.jsonl`);
    fs.appendFileSync(
      file,
      JSON.stringify({ ts: now.toISOString(), ...event }) + "\n",
    );
  } catch {
    // Logging must never break the session.
  }
}

/** PreToolUse: deny the tool call with a reason Claude sees. */
export function deny(input, reason, hook) {
  logEvent(input.session_id, {
    event: "blocked",
    hook,
    tool: input.tool_name,
    target: redact(
      input.tool_input?.file_path || input.tool_input?.command || "",
    ),
    reason,
  });
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: `[${hook}] ${reason}`,
      },
    }),
  );
  process.exit(0);
}
