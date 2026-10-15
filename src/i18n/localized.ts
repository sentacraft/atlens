import { hasLocale } from "next-intl";
import { routing, type Locale } from "./routing";

/** Text carried in data with one entry per locale, such as a collection title. */
export type LocalizedText = Record<Locale, string>;

/** The entry for `locale`, or the default locale's for an unknown one. */
export function localized(text: LocalizedText, locale: string): string {
  return text[hasLocale(routing.locales, locale) ? locale : routing.defaultLocale];
}
