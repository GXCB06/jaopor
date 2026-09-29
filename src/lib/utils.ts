import { createCn } from "cn/config";

// Design.md §3 adds font-size steps (text-3xs/2xs/caption/body) and the `faint` colour. Without
// registering them, class merging reads `text-caption` as a colour and drops it next to e.g.
// `text-foreground`.
export const cn = createCn({
  extend: {
    classGroups: {
      "font-size": [{ text: ["3xs", "2xs", "caption", "body"] }],
    },
  },
});
