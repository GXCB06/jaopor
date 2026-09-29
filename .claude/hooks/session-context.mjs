// SessionStart: inject where the project stands (latest PROGRESS entries + open tasks of the current phase).
import fs from "node:fs";
import path from "node:path";
import { PROJECT_DIR, logEvent, readInput } from "./lib.mjs";

const input = await readInput();
const read = (f) => {
  try {
    return fs.readFileSync(path.join(PROJECT_DIR, f), "utf8");
  } catch {
    return "";
  }
};

const entries = read("PROGRESS.md")
  .split(/^## /m)
  .slice(1, 4)
  .map((e) => `## ${e.trim()}`);

// First roadmap phase that still has unchecked boxes.
const roadmap = read("Project.md")
  .split(/^## 5\./m)[0]
  .split(/^### /m)
  .slice(1);
const current = roadmap.find((p) => /- \[ \]/.test(p));
const phaseTitle = current?.split("\n")[0].trim();
const open =
  current
    ?.split("\n")
    .filter((l) => /^- \[ \]/.test(l))
    .slice(0, 12) ?? [];

const context = [
  "## JaoPor session context (from SessionStart hook)",
  phaseTitle
    ? `Current phase: **${phaseTitle}** — open tasks:\n${open.join("\n")}`
    : "All roadmap phases complete.",
  entries.length
    ? `Latest PROGRESS.md entries:\n\n${entries.join("\n\n")}`
    : "PROGRESS.md has no entries yet.",
  "Reminder: log every completed task in PROGRESS.md + Project.md; UI follows Design.md.",
].join("\n\n");

logEvent(input.session_id, { event: "session-start", source: input.source });
process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext: context.slice(0, 9000),
    },
  }),
);
process.exit(0);
