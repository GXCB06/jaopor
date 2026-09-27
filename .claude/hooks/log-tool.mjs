// PreToolUse / PostToolUse / PostToolUseFailure (*): one redacted JSON line per event.
// `npm run harness:report` pairs pre/post by tool_use_id to compute durations.
import { logEvent, readInput, redact, relPath } from "./lib.mjs";

const input = await readInput();
const ti = input.tool_input || {};
const phase =
  { PreToolUse: "pre", PostToolUse: "post", PostToolUseFailure: "fail" }[
    input.hook_event_name
  ] || input.hook_event_name;

const target =
  relPath(ti.file_path || ti.notebook_path) ||
  redact(
    ti.command ||
      ti.pattern ||
      ti.url ||
      ti.query ||
      ti.skill ||
      ti.description ||
      "",
  );

const entry = {
  event: "tool",
  phase,
  tool: input.tool_name,
  id: input.tool_use_id,
  target,
};
if (phase === "fail")
  entry.error = redact(
    String(input.error || input.tool_response?.error || ""),
  ).slice(0, 300);

logEvent(input.session_id, entry);
process.exit(0);
