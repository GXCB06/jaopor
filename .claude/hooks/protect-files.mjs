// PreToolUse (Edit|Write|MultiEdit|NotebookEdit): block edits to files that must not be hand-edited.
import { execFileSync } from "node:child_process";
import path from "node:path";
import { PROJECT_DIR, deny, readInput, relPath } from "./lib.mjs";

const input = await readInput();
const filePath = input.tool_input?.file_path || input.tool_input?.notebook_path;
const rel = relPath(filePath);
const base = path.basename(filePath || "");

if (/^\.env(\..+)?$/.test(base) && base !== ".env.example") {
  deny(
    input,
    `${base} holds secrets. Ask the user to edit it; document new vars in .env.example.`,
    "protect-files",
  );
}

if (base === "package-lock.json") {
  deny(
    input,
    "Lockfiles are generated. Run `npm install <pkg>` instead of editing package-lock.json.",
    "protect-files",
  );
}

if (rel.startsWith(".claude/logs/")) {
  deny(
    input,
    "Observability logs are append-only and written by hooks.",
    "protect-files",
  );
}

// A migration that is already committed has (or will have) run somewhere: never rewrite it.
if (/^supabase\/migrations\/.+\.sql$/.test(rel)) {
  try {
    execFileSync("git", ["cat-file", "-e", `HEAD:${rel}`], {
      cwd: PROJECT_DIR,
      stdio: "ignore",
    });
    deny(
      input,
      `${rel} is already committed. Create a new migration with \`npx supabase migration new <name>\`.`,
      "protect-files",
    );
  } catch {
    // Not in HEAD yet → still a draft, editing is fine.
  }
}

process.exit(0);
