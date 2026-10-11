import { describe, expect, it, vi } from "vitest";
import { ANON_REPO, realIdentity, withRealLinks } from "./anonymous";

const identity = {
  slug: "secret-sauce",
  name: "Secret Sauce",
  logo_path: null,
  website_url: "https://secret.example",
  app_store_url: null,
  play_store_url: null,
  line_url: null,
  github_url: null,
  github_repo: "me/secret",
  demo_video_url: null,
};
const client = (data: unknown, error: unknown = null) =>
  ({ rpc: vi.fn(async () => ({ data, error })), from: vi.fn() }) as never;

describe("realIdentity", () => {
  it("returns the owner's row, or null for no row / an error (migration not applied)", async () => {
    expect(await realIdentity(client([identity]), 1)).toEqual(identity);
    expect(await realIdentity(client([]), 1)).toBeNull();
    expect(
      await realIdentity(client(null, { code: "PGRST202" }), 1),
    ).toBeNull();
  });
});

describe("withRealLinks", () => {
  it("leaves a row with a public website alone (no extra query)", async () => {
    const c = client([identity]);
    const row = { id: 1, website_url: "https://public.example" };
    expect(await withRealLinks(c, row)).toBe(row);
    expect(
      (c as unknown as { rpc: ReturnType<typeof vi.fn> }).rpc,
    ).not.toHaveBeenCalled();
  });

  it("fills an anonymous row's website and repo from the stash", async () => {
    expect(
      await withRealLinks(client([identity]), {
        id: 1,
        website_url: null,
        github_repo: ANON_REPO,
      }),
    ).toEqual({
      id: 1,
      website_url: "https://secret.example",
      github_repo: "me/secret",
    });
  });

  it("a row without a website that isn't anonymous stays as is", async () => {
    expect(
      await withRealLinks(client([]), { id: 1, website_url: null }),
    ).toEqual({ id: 1, website_url: null });
  });
});
