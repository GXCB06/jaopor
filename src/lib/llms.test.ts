import { describe, expect, it } from "vitest";
import {
  absUrl,
  markdownPathTarget,
  mdText,
  renderLlmsTxt,
  renderMarkdownDoc,
} from "./llms";

describe("mdText", () => {
  it("collapses newlines and runs of spaces", () => {
    expect(mdText("  hello\n\n  world  ")).toBe("hello world");
  });
});

describe("absUrl", () => {
  it("joins a base and a path with exactly one slash", () => {
    expect(absUrl("https://jaopor.vercel.app", "/th/startups")).toBe(
      "https://jaopor.vercel.app/th/startups",
    );
    expect(absUrl("https://jaopor.vercel.app/", "th/startups")).toBe(
      "https://jaopor.vercel.app/th/startups",
    );
  });
});

describe("markdownPathTarget", () => {
  it("rewrites a project page to its Markdown twin when asked for Markdown", () => {
    expect(markdownPathTarget("/th/startup/acme", "text/markdown")).toBe(
      "/th/startup/acme/md",
    );
    expect(
      markdownPathTarget("/en/startup/acme", "text/html, text/markdown"),
    ).toBe("/en/startup/acme/md");
    expect(markdownPathTarget("/th/startup/acme/", "text/markdown")).toBe(
      "/th/startup/acme/md",
    );
  });

  it("leaves other requests alone", () => {
    expect(markdownPathTarget("/th/startup/acme", "text/html")).toBeNull();
    expect(markdownPathTarget("/th/startup/acme", null)).toBeNull();
    expect(
      markdownPathTarget("/th/startup/acme/md", "text/markdown"),
    ).toBeNull();
    expect(markdownPathTarget("/th/startups", "text/markdown")).toBeNull();
    expect(markdownPathTarget("/th/u/handle", "text/markdown")).toBeNull();
    expect(markdownPathTarget("/startup/acme", "text/markdown")).toBeNull();
  });
});

describe("renderMarkdownDoc", () => {
  it("emits title, blockquote, facts and sections with a footer", () => {
    const md = renderMarkdownDoc({
      title: "Acme",
      summary: "A tool",
      facts: [
        { label: "MRR", value: "$1,200" },
        { label: "Empty", value: "  " },
      ],
      factsHeading: "Verified numbers",
      sections: [{ heading: "About", body: "Acme builds things." }],
      footer: "Source: https://example.com",
    });
    expect(md).toContain("# Acme");
    expect(md).toContain("> A tool");
    expect(md).toContain("## Verified numbers");
    expect(md).toContain("- **MRR:** $1,200");
    expect(md).not.toContain("Empty");
    expect(md).toContain("## About\n\nAcme builds things.");
    expect(md.trimEnd().endsWith("Source: https://example.com")).toBe(true);
  });

  it("omits an empty summary and empty sections", () => {
    const md = renderMarkdownDoc({
      title: "Acme",
      summary: null,
      facts: [],
      sections: [{ heading: "About", body: "   " }],
      footer: "end",
    });
    expect(md.startsWith("# Acme\n")).toBe(true);
    expect(md).not.toContain(">");
    expect(md).not.toContain("## About");
  });
});

describe("renderLlmsTxt", () => {
  it("renders linked sections and plain-text entries", () => {
    const out = renderLlmsTxt({
      title: "JaoPor",
      summary: "Verified numbers for projects built in Thailand.",
      intro: "Start here.",
      sections: [
        {
          heading: "Key pages",
          items: [
            { title: "Projects", url: "https://x/th/startups", note: "all" },
            { title: "Feed" },
          ],
        },
      ],
      footer: "Built by builders.",
    });
    expect(out.startsWith("# JaoPor\n\n> Verified numbers")).toBe(true);
    expect(out).toContain("Start here.");
    expect(out).toContain("## Key pages");
    expect(out).toContain("- [Projects](https://x/th/startups): all");
    expect(out).toContain("- Feed");
    expect(out.trimEnd().endsWith("Built by builders.")).toBe(true);
    expect(out.endsWith("\n")).toBe(true);
  });

  it("drops sections with nothing in them", () => {
    const out = renderLlmsTxt({
      title: "JaoPor",
      summary: "x",
      sections: [{ heading: "Empty", items: [{ title: "  " }] }],
    });
    expect(out).not.toContain("## Empty");
  });
});
