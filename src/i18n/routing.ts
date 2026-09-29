import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["th", "en"],
  defaultLocale: "th",
  // Thai-first launch audience: many Thai users run English browsers, so don't auto-redirect
  // by Accept-Language. `/` → `/th`; the header switch (and its cookie) moves people to `/en`.
  localeDetection: false,
});

export type Locale = (typeof routing.locales)[number];
