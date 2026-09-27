#!/usr/bin/env node
// Observability report for the Claude Code harness.
// Usage: npm run harness:report [-- --days 7] [-- --session <id>]
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const days = Number(opt("days", 1));
const onlySession = opt("session");

const root = path.join(process.cwd(), ".claude", "logs");
if (!fs.existsSync(root)) {
  console.log("No logs yet (.claude/logs is empty).");
  process.exit(0);
}

const cutoff = new Date(Date.now() - days * 86_400_000)
  .toISOString()
  .slice(0, 10);
const dayDirs = fs
  .readdirSync(root)
  .filter((d) => d >= cutoff)
  .sort();

const sessions = new Map();
for (const day of dayDirs) {
  for (const file of fs.readdirSync(path.join(root, day))) {
    const id = file.replace(/\.jsonl$/, "");
    if (onlySession && id !== onlySession) continue;
    const lines = fs
      .readFileSync(path.join(root, day, file), "utf8")
      .split("\n")
      .filter(Boolean);
    const events = lines.flatMap((l) => {
      try {
        return [JSON.parse(l)];
      } catch {
        return [];
      }
    });
    sessions.set(id, [...(sessions.get(id) || []), ...events]);
  }
}

const pad = (s, n) => String(s).padEnd(n);
const fmtMs = (ms) =>
  ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`;

console.log(
  `Harness report — last ${days} day(s), ${sessions.size} session(s)\n`,
);

for (const [id, events] of sessions) {
  const tools = new Map(); // name → { calls, fails, totalMs }
  const pre = new Map();
  const files = new Set();
  const blocked = [];
  const quality = { ok: 0, bad: 0 };
  let gate = 0;

  for (const e of events) {
    if (e.event === "tool") {
      const t = tools.get(e.tool) || { calls: 0, fails: 0, totalMs: 0 };
      if (e.phase === "pre") {
        pre.set(e.id, Date.parse(e.ts));
        t.calls++;
      } else if (pre.has(e.id)) {
        t.totalMs += Date.parse(e.ts) - pre.get(e.id);
        if (e.phase === "fail") t.fails++;
      }
      tools.set(e.tool, t);
      if (
        /^(Edit|Write|MultiEdit|NotebookEdit)$/.test(e.tool) &&
        e.phase === "post" &&
        e.target
      )
        files.add(e.target);
    } else if (e.event === "blocked") blocked.push(e);
    else if (e.event === "quality") quality[e.ok ? "ok" : "bad"]++;
    else if (e.event === "progress-gate") gate++;
  }

  const first = events[0]?.ts?.replace("T", " ").slice(0, 19);
  const last = events.at(-1)?.ts?.replace("T", " ").slice(0, 19);
  console.log(`■ Session ${id}  (${first} → ${last} UTC)`);
  console.log(`  ${pad("tool", 34)}${pad("calls", 7)}${pad("fails", 7)}avg`);
  for (const [name, t] of [...tools].sort((a, b) => b[1].calls - a[1].calls)) {
    console.log(
      `  ${pad(name, 34)}${pad(t.calls, 7)}${pad(t.fails, 7)}${t.calls ? fmtMs(t.totalMs / t.calls) : "-"}`,
    );
  }
  console.log(
    `  quality hook: ${quality.ok} clean, ${quality.bad} with problems · progress-gate nudges: ${gate}`,
  );
  if (blocked.length) {
    console.log(`  blocked (${blocked.length}):`);
    for (const b of blocked.slice(-10))
      console.log(`    - [${b.hook}] ${b.target} — ${b.reason}`);
  }
  if (files.size)
    console.log(
      `  files touched (${files.size}): ${[...files].slice(0, 25).join(", ")}`,
    );
  console.log();
}
