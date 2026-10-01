import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import * as simpleIcons from "simple-icons";
import { describe, expect, it } from "vitest";
import { CATEGORIES, CATEGORY_LIST } from "./categories";
import { CHANNEL_LIST, isChannelValue, toChannelValue } from "./channels";
import {
  PROVINCE_LIST,
  REGION_LIST,
  REGIONS,
  matchProvince,
} from "./provinces";
import {
  AI_TOOLS,
  STACK_LIST,
  STORED_STACK_GROUPS,
  isValidTechStack,
  matchStackLabel,
} from "./stack";

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const unique = (xs: readonly string[]) => new Set(xs).size === xs.length;
const hasSimpleIcon = (slug: string) =>
  `si${slug[0].toUpperCase()}${slug.slice(1)}` in simpleIcons;

// The migration that created the vocabularies (lists generated from these files).
const MIGRATION = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations",
    readdirSync(join(process.cwd(), "supabase/migrations")).find((f) =>
      f.endsWith("_spec_phase1_vocab.sql"),
    )!,
  ),
  "utf8",
);
const quoted = (s: string) => [...s.matchAll(/'([^']*)'/g)].map((m) => m[1]);

describe("provinces", () => {
  it("has all 77 (76 + Bangkok) with unique slugs and names", () => {
    expect(PROVINCE_LIST).toHaveLength(77);
    expect(unique(PROVINCE_LIST.map((p) => p.slug))).toBe(true);
    expect(unique(PROVINCE_LIST.map((p) => p.nameTh))).toBe(true);
    expect(unique(PROVINCE_LIST.map((p) => p.nameEn))).toBe(true);
    for (const p of PROVINCE_LIST) expect(p.slug).toMatch(SLUG);
  });

  it("uses the official 6-region grouping", () => {
    expect(REGION_LIST.map((r) => r.slug)).toEqual([...REGIONS]);
    const count = (r: string) =>
      PROVINCE_LIST.filter((p) => p.region === r).length;
    expect(REGIONS.map(count)).toEqual([9, 20, 22, 7, 5, 14]);
    expect(PROVINCE_LIST.find((p) => p.slug === "bangkok")?.region).toBe(
      "central",
    );
  });

  it("matches free-text locations", () => {
    expect(matchProvince("มุกดาหาร, ไทย")).toBe("mukdahan");
    expect(matchProvince("จ.เชียงใหม่")).toBe("chiang-mai");
    expect(matchProvince("จังหวัดขอนแก่น")).toBe("khon-kaen");
    expect(matchProvince("Nakhon Ratchasima")).toBe("nakhon-ratchasima");
    expect(matchProvince("กทม")).toBe("bangkok");
    expect(matchProvince("กรุงเทพมหานคร")).toBe("bangkok");
    expect(matchProvince("Tokyo")).toBeNull();
    expect(matchProvince(null)).toBeNull();
  });

  it("matches the migration's provinces seed", () => {
    const seeded = [
      ...MIGRATION.slice(
        MIGRATION.indexOf("insert into public.provinces"),
        MIGRATION.indexOf("-- Free-text"),
      ).matchAll(/\('([a-z-]+)', '([^']+)', '([^']+)', '([a-z]+)'\)/g),
    ].map(([, slug, nameTh, nameEn, region]) => ({
      slug,
      nameTh,
      nameEn,
      region,
    }));
    expect(seeded).toEqual(
      PROVINCE_LIST.map(({ slug, nameTh, nameEn, region }) => ({
        slug,
        nameTh,
        nameEn,
        region,
      })),
    );
  });

  it("has a centre point inside Thailand for every province", () => {
    for (const p of PROVINCE_LIST) {
      expect(p.lat, p.slug).toBeGreaterThan(5.6);
      expect(p.lat, p.slug).toBeLessThan(20.5);
      expect(p.lng, p.slug).toBeGreaterThan(97.3);
      expect(p.lng, p.slug).toBeLessThan(105.7);
    }
  });
});

describe("categories", () => {
  it("has 37 unique slugs and keeps every existing one", () => {
    expect(CATEGORY_LIST).toHaveLength(37);
    expect(unique([...CATEGORIES])).toBe(true);
    for (const old of [
      "ai",
      "saas",
      "developer-tools",
      "fintech",
      "marketing",
      "ecommerce",
      "productivity",
      "education",
      "health",
      "content",
      "design",
      "analytics",
      "mobile",
      "other",
    ])
      expect(CATEGORIES).toContain(old);
    for (const c of CATEGORY_LIST) {
      expect(c.slug).toMatch(SLUG);
      expect(c.nameTh && c.nameEn && c.descTh && c.descEn).toBeTruthy();
    }
  });

  it("matches the migration's category check", () => {
    const check = MIGRATION.match(/category in \(([^)]*)\)/)![1];
    expect(quoted(check)).toEqual([...CATEGORIES]);
  });
});

describe("stack", () => {
  it("has unique slugs per group and real Simple Icons", () => {
    for (const g of [...STORED_STACK_GROUPS, "built_with"]) {
      expect(
        unique(STACK_LIST.filter((i) => i.group === g).map((i) => i.slug)),
      ).toBe(true);
    }
    for (const i of STACK_LIST) {
      expect(i.slug).toMatch(SLUG);
      if ("simpleIcon" in i)
        expect(hasSimpleIcon(i.simpleIcon), i.simpleIcon).toBe(true);
      else expect(i.lucideIcon).toBeTruthy();
    }
  });

  it("built_with is exactly the ai_tools vocabulary", () => {
    expect(
      STACK_LIST.filter((i) => i.group === "built_with")
        .map((i) => i.slug)
        .sort(),
    ).toEqual([...AI_TOOLS].filter((t) => t !== "claude").sort());
  });

  it("validates stored stacks like the DB trigger", () => {
    expect(isValidTechStack({})).toBe(true);
    expect(
      isValidTechStack({
        frontend: ["next-js"],
        payments: ["stripe", "promptpay"],
      }),
    ).toBe(true);
    expect(isValidTechStack({ frontend: ["stripe"] })).toBe(false);
    expect(isValidTechStack({ built_with: ["cursor"] })).toBe(false);
    expect(isValidTechStack({ frontend: "next-js" })).toBe(false);
    expect(isValidTechStack([])).toBe(false);
  });

  it("maps old free-text labels", () => {
    expect(matchStackLabel("Next.js")).toEqual({
      group: "frontend",
      slug: "next-js",
    });
    expect(matchStackLabel("Claude API")).toEqual({
      group: "ai",
      slug: "claude",
    });
    expect(matchStackLabel("PostgreSQL")).toEqual({
      group: "database",
      slug: "postgresql",
    });
    expect(matchStackLabel("RevenueCat")).toEqual({
      group: "payments",
      slug: "revenuecat",
    });
    expect(matchStackLabel("Prisma")).toEqual({
      group: "backend",
      slug: "prisma",
    });
    expect(matchStackLabel("JavaScript")).toEqual({
      group: "language",
      slug: "javascript",
    });
    expect(matchStackLabel("COBOL")).toBeNull();
  });

  it("matches the allowed slugs of the latest migration that defines the vocab trigger", () => {
    // Applied migrations are immutable history; only the newest definition must match config.
    const dir = join(process.cwd(), "supabase/migrations");
    const latest = readdirSync(dir)
      .sort()
      .map((f) => readFileSync(join(dir, f), "utf8"))
      .filter((sql) => sql.includes("function private.startups_validate_vocab"))
      .at(-1)!;
    for (const g of STORED_STACK_GROUPS) {
      const m = latest.match(new RegExp(String.raw`'${g}', '(\[[^\]]*\])'::jsonb`))!;
      expect(m, g).toBeTruthy();
      expect(JSON.parse(m[1])).toEqual(
        STACK_LIST.filter((i) => i.group === g).map((i) => i.slug),
      );
    }
  });

  it("has a generated glyph for every Simple Icon the config uses", async () => {
    const { GLYPHS } = await import("./glyphs");
    for (const i of [...STACK_LIST, ...CHANNEL_LIST])
      if ("simpleIcon" in i)
        expect(GLYPHS[i.simpleIcon], i.simpleIcon).toBeTruthy();
  });
});

describe("channels", () => {
  it("has unique slugs and real Simple Icons", () => {
    expect(unique(CHANNEL_LIST.map((c) => c.slug))).toBe(true);
    for (const c of CHANNEL_LIST) {
      expect(c.slug).toMatch(SLUG);
      if ("simpleIcon" in c)
        expect(hasSimpleIcon(c.simpleIcon), c.simpleIcon).toBe(true);
      else expect(c.lucideIcon).toBeTruthy();
    }
  });

  it("maps free text to slugs or custom entries", () => {
    expect(toChannelValue("Facebook groups")).toBe("facebook-groups");
    expect(toChannelValue("LINE OA")).toBe("line-oa");
    expect(toChannelValue("ปากต่อปาก")).toBe("word-of-mouth");
    expect(toChannelValue("App Store optimization")).toBe(
      "custom:App Store optimization",
    );
    expect(isChannelValue("seo")).toBe(true);
    expect(isChannelValue("custom:Pantip ads")).toBe(true);
    expect(isChannelValue("custom:")).toBe(false);
    expect(isChannelValue("myspace")).toBe(false);
  });

  it("matches the migration's channel list", () => {
    const list = MIGRATION.match(/c = any \(array\[([^\]]*)\]\)/)![1];
    expect(quoted(list)).toEqual(CHANNEL_LIST.map((c) => c.slug));
  });
});

describe("custom stack entries (stack_custom_entries)", () => {
  it("allows custom: values only in the other group", async () => {
    const { toTechStack, stackGroups } = await import("./display");
    expect(
      isValidTechStack({ other: ["custom:Prisma"], frontend: ["react"] }),
    ).toBe(true);
    expect(isValidTechStack({ frontend: ["custom:Prisma"] })).toBe(false);
    expect(isValidTechStack({ other: ["prisma"] })).toBe(false);
    expect(isValidTechStack({ other: [`custom:${"x".repeat(31)}`] })).toBe(
      false,
    );
    const stack = toTechStack({
      other: ["custom:Prisma", 5],
      backend: ["python"],
    });
    expect(stack).toEqual({ backend: ["python"], other: ["custom:Prisma"] });
    expect(
      stackGroups(stack, "en").map((g) => [
        g.group,
        g.items.map((i) => i.label),
      ]),
    ).toEqual([
      ["backend", ["Python"]],
      ["other", ["Prisma"]],
    ]);
  });

  it("round-trips the form values", async () => {
    const { stackToValues, valuesToStack, toCustomStack } =
      await import("@/components/wizard/vocab-options");
    const values = ["next-js", "supabase", toCustomStack("LINE Messaging API")];
    const stack = valuesToStack(values);
    expect(stack).toEqual({
      frontend: ["next-js"],
      backend: ["supabase"],
      other: ["custom:LINE Messaging API"],
    });
    expect(stackToValues(stack)).toEqual(values);
  });
});
