// AI-readable surfaces (Design.md §4 SEO): the root `llms.txt` index and a Markdown twin of every
// public project profile. Pure builders so the routes only assemble (localized) data; the shape is
// tested in llms.test.ts. Convention: <https://llmstxt.org/>.

export type MdFact = { label: string; value: string };
export type MdSection = { heading: string; body: string };

export type LlmsEntry = { title: string; url?: string; note?: string };
export type LlmsSection = { heading: string; items: LlmsEntry[] };

/** Collapse whitespace and escape the few characters that would break a Markdown line. */
export function mdText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/** Absolute URL for a site-relative path ("/th/startups"), tolerating a trailing slash on `base`. */
export function absUrl(base: string, path: string): string {
  return `${base.replace(/\/+$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

const PROFILE_MD = /^\/(?:th|en)\/startup\/[a-z0-9-]{1,50}$/;

/**
 * The rewrite target for a project page when the client asked for Markdown (`Accept: text/markdown`),
 * or null. Lets agents fetch the human URL and still get the `.md` twin (Design.md §4 SEO).
 */
export function markdownPathTarget(
  pathname: string,
  accept: string | null,
): string | null {
  if (!accept || !/text\/markdown/i.test(accept)) return null;
  const path = pathname.replace(/\/+$/, "");
  if (!PROFILE_MD.test(path)) return null;
  return `${path}/md`;
}

/**
 * A profile's Markdown twin: the title, a blockquote summary, the verified-number bullets, then the
 * narrative sections, then a provenance footer that links back to the human page.
 */
export function renderMarkdownDoc(doc: {
  title: string;
  summary: string | null;
  facts: MdFact[];
  factsHeading?: string;
  sections: MdSection[];
  footer: string;
}): string {
  const lines: string[] = [`# ${mdText(doc.title)}`];
  if (doc.summary) lines.push("", `> ${mdText(doc.summary)}`);

  const facts = doc.facts.filter((f) => f.value.trim() !== "");
  if (facts.length) {
    lines.push("", `## ${mdText(doc.factsHeading ?? "Key numbers")}`, "");
    for (const f of facts) {
      lines.push(`- **${mdText(f.label)}:** ${mdText(f.value)}`);
    }
  }

  for (const s of doc.sections) {
    const body = s.body.trim();
    if (!body) continue;
    lines.push("", `## ${mdText(s.heading)}`, "", body);
  }

  lines.push("", "---", "", mdText(doc.footer), "");
  return lines.join("\n");
}

/**
 * `llms.txt`: an H1 title, a blockquote summary, then linked sections (the convention's shape).
 * Entries without a URL print as plain text (used for counts / "many more" pointers).
 */
export function renderLlmsTxt(doc: {
  title: string;
  summary: string;
  intro?: string;
  sections: LlmsSection[];
  footer?: string;
}): string {
  const lines: string[] = [
    `# ${mdText(doc.title)}`,
    "",
    `> ${mdText(doc.summary)}`,
  ];
  if (doc.intro) lines.push("", mdText(doc.intro));
  for (const section of doc.sections) {
    const items = section.items.filter((i) => i.title.trim() !== "");
    if (!items.length) continue;
    lines.push("", `## ${mdText(section.heading)}`, "");
    for (const item of items) {
      const note = item.note ? mdText(item.note) : "";
      const head = item.url
        ? `[${mdText(item.title)}](${item.url})`
        : mdText(item.title);
      lines.push(note ? `- ${head}: ${note}` : `- ${head}`);
    }
  }
  if (doc.footer) lines.push("", mdText(doc.footer));
  return `${lines.join("\n")}\n`;
}
