// Dashboard missions "ภารกิจเจ้าพ่อ" (Design.md §6 Dashboard overview, owner 2026-10-25). Pure.
// Missions 1-5 come from the database (server); 6-7 are per-browser flags (localStorage), a
// nice-to-have that is never trusted for anything else.

export const MISSIONS = [
  "firstStartup",
  "verify",
  "profile",
  "firstPost",
  "follow3",
  "olympics",
  "share",
] as const;
export type Mission = (typeof MISSIONS)[number];

/** The browser-only missions and their localStorage keys. */
export const LOCAL_MISSIONS = {
  olympics: "jaopor.mission.olympics",
  share: "jaopor.mission.share",
} as const satisfies Partial<Record<Mission, string>>;

export type ServerMissionInput = {
  publishedStartups: number;
  verifiedStartups: number;
  headline: string | null;
  province: string | null;
  skills: number;
  posts: number;
  follows: number;
};

/** Missions 1-5 from the founder's data. */
export function serverMissions(
  i: ServerMissionInput,
): Record<Exclude<Mission, keyof typeof LOCAL_MISSIONS>, boolean> {
  return {
    firstStartup: i.publishedStartups > 0,
    verify: i.verifiedStartups > 0,
    profile: Boolean(i.headline?.trim()) && Boolean(i.province) && i.skills > 0,
    firstPost: i.posts > 0,
    follow3: i.follows >= 3,
  };
}

/** Mark a browser mission done (safe when storage is blocked). */
export function markLocalMission(m: keyof typeof LOCAL_MISSIONS): void {
  try {
    localStorage.setItem(LOCAL_MISSIONS[m], "1");
  } catch {
    // Private mode / blocked storage: the mission just stays open.
  }
}

export function localMissionDone(m: keyof typeof LOCAL_MISSIONS): boolean {
  try {
    return localStorage.getItem(LOCAL_MISSIONS[m]) === "1";
  } catch {
    return false;
  }
}
