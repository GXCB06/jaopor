// PreToolUse (Bash|PowerShell): block destructive or secret-leaking shell commands.
import { deny, readInput } from "./lib.mjs";

const input = await readInput();
const cmd = String(input.tool_input?.command || "");
const lower = cmd.toLowerCase();

// Build/cache dirs that are always safe to delete recursively.
const SAFE_DELETE =
  /^(\.\/)?(node_modules|\.next|out|dist|build|coverage|supabase\/\.temp|playwright-report|test-results|\.turbo)\/?$/;

const RULES = [
  {
    test: () =>
      /\bgit\s+push\b.*(--force\b|--force-with-lease\b|\s-f\b)/.test(cmd),
    reason:
      "Force-push rewrites shared history. Push normally or ask the user.",
  },
  {
    test: () =>
      /\bgit\s+(reset\s+--hard|clean\s+-[a-z]*f|checkout\s+--\s+\.|restore\s+\.)/.test(
        cmd,
      ),
    reason:
      "This discards uncommitted work. Stash or commit instead, or ask the user.",
  },
  {
    test: () => /\bsupabase\s+db\s+reset\b.*--(linked|db-url)/.test(lower),
    reason:
      "Resetting a remote Supabase database destroys data. Only reset the local DB.",
  },
  {
    test: () => /\b(drop\s+(database|schema)|truncate\s+table)\b/.test(lower),
    reason: "Destructive SQL. Write a reviewed migration instead.",
  },
  {
    // cat/type/Get-Content/less/head/tail of .env files
    test: () =>
      /\b(cat|type|less|more|head|tail|bat|get-content|gc)\b[^|;&]*\.env(?!\.example)\b/.test(
        lower,
      ),
    reason: "Don't print .env files; they hold secrets.",
  },
  {
    test: () =>
      /^\s*(printenv|env|set|get-childitem\s+env:|gci\s+env:|dir\s+env:)\s*$/.test(
        lower,
      ) ||
      (/\$(env:)?[a-z_]*(secret|service_role|private|password|token|api_key)[a-z_]*/i.test(
        cmd,
      ) &&
        /\b(echo|write-output|write-host|print)\b/i.test(cmd)),
    reason: "This would print secrets into the transcript.",
  },
  {
    test: () => {
      // rm -rf / Remove-Item -Recurse -Force with any target outside SAFE_DELETE
      const rm = cmd.match(
        /\brm\s+(-[a-z]*r[a-z]*f[a-z]*|-[a-z]*f[a-z]*r[a-z]*|-r\s+-f|-f\s+-r)\s+([^;&|]+)/i,
      );
      const ri =
        /\bremove-item\b/i.test(cmd) && /-recurse/i.test(cmd)
          ? cmd.match(/\bremove-item\s+(?:-[a-z]+\s+)*["']?([^\s"';&|]+)/i)
          : null;
      const targets = rm ? rm[2].trim().split(/\s+/) : ri ? [ri[1]] : [];
      return targets.some((t) => !SAFE_DELETE.test(t.replace(/["']/g, "")));
    },
    reason:
      "Recursive delete outside build/cache dirs (node_modules, .next, dist, coverage…). Delete specific files, or ask the user.",
  },
];

for (const rule of RULES) {
  if (rule.test()) deny(input, rule.reason, "guard-shell");
}

process.exit(0);
