// One completeness model for a project (UX audit S-6), used by the edit page header and the
// dashboard cards so both show the same percentage. What visitors use most weighs most.

export const KEY_WEIGHTS = {
  verified: 30,
  screenshots: 20,
  description: 15,
  province: 10,
} as const;
/** Shared by every other field (name, tagline, logo, links, story, stack, founder…). */
export const REST_WEIGHT = 25;

export type CompletenessInput = {
  /** Any number from a connected source (revenue, build proof, owner check, visitors). */
  verified: boolean;
  screenshots: boolean;
  description: boolean;
  /** Set, or not needed (outside Thailand). */
  province: boolean;
  /** Every other field, true when filled. */
  rest: boolean[];
};

export function completenessPct(i: CompletenessInput): number {
  const key =
    (i.verified ? KEY_WEIGHTS.verified : 0) +
    (i.screenshots ? KEY_WEIGHTS.screenshots : 0) +
    (i.description ? KEY_WEIGHTS.description : 0) +
    (i.province ? KEY_WEIGHTS.province : 0);
  const rest = i.rest.length
    ? (i.rest.filter(Boolean).length / i.rest.length) * REST_WEIGHT
    : REST_WEIGHT;
  return Math.round(key + rest);
}
