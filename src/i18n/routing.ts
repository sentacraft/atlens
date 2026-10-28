import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["zh", "en"],
  defaultLocale: "en",
  // Pages declare hreflang in their own <head>; the middleware's Link header pointed x-default at
  // an unprefixed URL that redirects, so the two disagreed and Google drops a conflicting pair.
  alternateLinks: false,
});

export type Locale = (typeof routing.locales)[number];
