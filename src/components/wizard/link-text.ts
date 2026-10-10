import type { useTranslations } from "next-intl";
import type { LinkCheck, LinkChoice, LinkKind } from "@/lib/links";

type LinksT = ReturnType<typeof useTranslations<"Links">>;

/** The label of a link type in the type control ("other" = a page on a platform). */
export function linkChoiceLabel(lt: LinksT, choice: LinkChoice): string {
  if (choice === "other") return lt("other");
  if (choice === "website") return lt("websiteOwn");
  return lt(choice);
}

/**
 * What to tell the founder about a link that can't be saved (A1.2: say why and what to do, never
 * a generic "invalid"). `expected` is the box or type the link was meant for.
 */
export function linkProblemText(
  lt: LinksT,
  check: LinkCheck | null,
  expected: LinkChoice | null = null,
): string {
  if (!check) return lt("needOne");
  if (check.ok) {
    // A valid link in the wrong box (edit form): a GitHub link in the LINE box, etc.
    return expected && expected !== "other"
      ? lt(`invalidKind.${expected as LinkKind}`)
      : lt("invalid");
  }
  switch (check.problem) {
    case "short_link":
      return lt("problems.short_link");
    case "not_own_site":
      return lt("problems.not_own_site", {
        platform: check.platform ? lt(`platforms.${check.platform}`) : "",
      });
    case "unknown_platform":
      return lt("problems.unknown_platform");
    case "invalid": {
      const kind = expected ?? check.expected;
      return kind && kind !== "other"
        ? lt(`invalidKind.${kind}`)
        : lt("invalid");
    }
  }
}
