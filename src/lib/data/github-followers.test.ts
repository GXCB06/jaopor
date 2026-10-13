import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/env", () => ({ serverEnv: { githubToken: () => undefined } }));

import {
  githubLoginFromLink,
  verifiedGithubFollowers,
} from "./github-followers";

const ok = (body: unknown) =>
  vi.fn(async () => new Response(JSON.stringify(body), { status: 200 }));

describe("githubLoginFromLink", () => {
  it.each([
    ["https://github.com/GXCB06", "gxcb06"],
    ["github.com/gxcb06/", "gxcb06"],
    ["@GXCB06", "gxcb06"],
    ["GXCB06", "gxcb06"],
  ])("%s → %s", (v, want) => expect(githubLoginFromLink(v)).toBe(want));

  it.each([
    null,
    "",
    "https://github.com/a/repo",
    "https://gitlab.com/a",
    "a b",
  ])("%s → null", (v) => expect(githubLoginFromLink(v)).toBeNull());
});

describe("verifiedGithubFollowers", () => {
  it("returns followers when the listed account is the sign-in account", async () => {
    const fetchImpl = ok({ login: "GXCB06", followers: 42 });
    const r = await verifiedGithubFollowers("u1", "github.com/gxcb06", {
      signInLogin: async () => "GXCB06",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(r).toEqual({ login: "GXCB06", followers: 42 });
  });

  it("shows nothing when the listed account isn't theirs", async () => {
    const fetchImpl = ok({ followers: 9999 });
    const r = await verifiedGithubFollowers("u1", "github.com/someone-famous", {
      signInLogin: async () => "gxcb06",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(r).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("shows nothing without a GitHub sign-in, or when GitHub fails", async () => {
    expect(
      await verifiedGithubFollowers("u1", "gxcb06", {
        signInLogin: async () => null,
        fetchImpl: ok({ followers: 1 }) as unknown as typeof fetch,
      }),
    ).toBeNull();
    expect(
      await verifiedGithubFollowers("u1", "gxcb06", {
        signInLogin: async () => "gxcb06",
        fetchImpl: vi.fn(
          async () => new Response("", { status: 403 }),
        ) as unknown as typeof fetch,
      }),
    ).toBeNull();
  });
});
