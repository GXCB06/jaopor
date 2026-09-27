// PostToolUse (Edit|Write|MultiEdit): prettier + eslint --fix on the edited file, then typecheck TS.
// Remaining problems are fed back to Claude via decision:"block" (the edit itself is kept).
import { spawnSync } from "node:child_process";
import path from "node:path";
import { PROJECT_DIR, logEvent, readInput, relPath } from "./lib.mjs";

const input = await readInput();
const rel = relPath(
  input.tool_input?.file_path || input.tool_response?.filePath,
);
if (!rel || /^(node_modules|\.next|\.claude\/logs)\//.test(rel))
  process.exit(0);

const ext = path.extname(rel);
const bin = (p) => path.join(PROJECT_DIR, "node_modules", p);
const run = (script, args) =>
  spawnSync(process.execPath, [bin(script), ...args], {
    cwd: PROJECT_DIR,
    encoding: "utf8",
    timeout: 90_000,
  });

const problems = [];

if (
  [
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".mjs",
    ".cjs",
    ".css",
    ".json",
    ".md",
  ].includes(ext)
) {
  const r = run("prettier/bin/prettier.cjs", [
    "--write",
    "--log-level",
    "warn",
    rel,
  ]);
  if (r.status !== 0)
    problems.push(
      `prettier failed on ${rel}:\n${(r.stderr || r.stdout).trim()}`,
    );
}

const isCode =
  [".ts", ".tsx", ".js", ".jsx", ".mjs"].includes(ext) &&
  !rel.startsWith(".claude/");
if (isCode) {
  const r = run("eslint/bin/eslint.js", ["--fix", rel]);
  if (r.status !== 0)
    problems.push(`eslint on ${rel}:\n${(r.stdout || r.stderr).trim()}`);
}

if ([".ts", ".tsx"].includes(ext)) {
  const r = run("typescript/bin/tsc", ["--noEmit", "--pretty", "false"]);
  if (r.status !== 0) {
    const lines = (r.stdout || r.stderr).trim().split("\n");
    const stale = lines.every((l) => l.startsWith(".next/types/"));
    problems.push(
      stale
        ? "tsc: stale .next route types — run `npm run typecheck` (it runs next typegen first)."
        : `tsc (${lines.length} error lines):\n${lines.slice(0, 20).join("\n")}`,
    );
  }
}

logEvent(input.session_id, {
  event: "quality",
  file: rel,
  ok: problems.length === 0,
});

if (problems.length) {
  process.stdout.write(
    JSON.stringify({
      decision: "block",
      reason: `[quality] Fix before moving on:\n\n${problems.join("\n\n")}`,
    }),
  );
}
process.exit(0);
