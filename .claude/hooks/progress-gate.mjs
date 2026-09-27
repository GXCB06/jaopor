// Stop: if project files changed after PROGRESS.md was last updated, block once and ask Claude to log the work.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { PROJECT_DIR, logEvent, readInput } from "./lib.mjs";

const input = await readInput();
if (input.stop_hook_active) process.exit(0); // already nudged this stop → never loop

// Changes that count as "work": app code, DB, messages, harness, config. Not logs or docs themselves.
const WORK =
  /^(src|supabase|messages|scripts|public|\.claude\/(hooks|skills|settings\.json))\/?|^(package\.json|next\.config\.ts|components\.json|tsconfig\.json|eslint\.config\.mjs)$/;

let changed = [];
try {
  const out = execFileSync("git", ["status", "--porcelain", "-uall"], {
    cwd: PROJECT_DIR,
    encoding: "utf8",
  });
  changed = out
    .split("\n")
    .filter(Boolean)
    .map((l) => l.slice(3).trim().replace(/^"|"$/g, "").split(" -> ").pop())
    .filter((f) => WORK.test(f));
} catch {
  process.exit(0);
}
if (!changed.length) process.exit(0);

const mtime = (f) => {
  try {
    return fs.statSync(path.join(PROJECT_DIR, f)).mtimeMs;
  } catch {
    return 0;
  }
};
const progressAt = mtime("PROGRESS.md");
const newer = changed.filter((f) => mtime(f) > progressAt);
if (!newer.length) process.exit(0);

logEvent(input.session_id, {
  event: "progress-gate",
  unlogged: newer.slice(0, 20),
});
process.stdout.write(
  JSON.stringify({
    decision: "block",
    reason:
      `[progress-gate] ${newer.length} changed file(s) are newer than PROGRESS.md (e.g. ${newer.slice(0, 5).join(", ")}). ` +
      "If this work is complete, add a PROGRESS.md entry (Done / Files / Verified / Next) and tick Project.md — or run /log-progress. " +
      "If it's still in progress, say so briefly and stop.",
  }),
);
process.exit(0);
