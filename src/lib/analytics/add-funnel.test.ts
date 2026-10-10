import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ rpc: vi.fn(), throwOnCreate: false }));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => {
    if (h.throwOnCreate) throw new Error("no client");
    return { rpc: h.rpc };
  },
}));

import {
  ADD_FAILED_CODES,
  FUNNEL_EVENTS,
  VERIFY_CHOICES,
  VERIFY_CODES,
  VERIFY_SOURCES,
} from "./funnel-types";
import { logAddEvent, newAttemptId } from "./add-funnel";

beforeEach(() => {
  h.rpc.mockReset();
  h.throwOnCreate = false;
});

describe("logAddEvent", () => {
  it("does not throw and swallows a rejected RPC", () => {
    h.rpc.mockReturnValue(Promise.reject(new Error("offline")));
    expect(() => logAddEvent("att-1", "add_opened")).not.toThrow();
  });

  it("does not throw when the client can't even be created", () => {
    h.throwOnCreate = true;
    expect(() => logAddEvent("att-1", "add_opened")).not.toThrow();
  });

  it("never awaits: returns undefined while the RPC is still pending", () => {
    h.rpc.mockReturnValue(new Promise(() => {})); // never settles
    const ret = logAddEvent("att-1", "add_opened");
    expect(ret).toBeUndefined();
    expect(h.rpc).toHaveBeenCalledTimes(1);
  });

  it("sends the event with whitelisted props and omits a null startup", () => {
    h.rpc.mockReturnValue(Promise.resolve({ data: null, error: null }));
    logAddEvent("att-1", "add_failed", null, { code: "invalid_link" });
    expect(h.rpc).toHaveBeenCalledWith("log_add_event", {
      p_attempt: "att-1",
      p_event: "add_failed",
      p_props: { code: "invalid_link" },
    });
  });

  it("includes the startup id when present", () => {
    h.rpc.mockReturnValue(Promise.resolve({ data: null, error: null }));
    logAddEvent("att-2", "add_created", 107);
    expect(h.rpc).toHaveBeenCalledWith("log_add_event", {
      p_attempt: "att-2",
      p_event: "add_created",
      p_startup: 107,
      p_props: {},
    });
  });
});

describe("newAttemptId", () => {
  it("returns a random UUID", () => {
    const id = newAttemptId();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(newAttemptId()).not.toBe(id);
  });
});

// The SQL whitelists in the migration and these TypeScript lists are two sources of truth for the
// same values; this fails the build if they drift apart.
describe("whitelist parity with the migration SQL", () => {
  const dir = path.join(process.cwd(), "supabase", "migrations");
  const file = readdirSync(dir).find((f) => f.endsWith("_add_funnel_events.sql"));
  const sql = file ? readFileSync(path.join(dir, file), "utf8") : "";

  it("finds the migration file", () => {
    expect(sql).not.toBe("");
  });

  it("every event / failed code / choice / source / verify code is in the SQL", () => {
    for (const v of [
      ...FUNNEL_EVENTS,
      ...ADD_FAILED_CODES,
      ...VERIFY_CHOICES,
      ...VERIFY_SOURCES,
      ...VERIFY_CODES,
    ]) {
      expect(sql).toContain(v);
    }
  });
});
