import en from "@/messages/en.json";
import zh from "@/messages/zh.json";
import { routing } from "@/i18n/routing";
import { SITE } from "@/config/site";

const MESSAGES: Record<string, Record<string, Record<string, unknown>>> = { en, zh };

/**
 * Replaces each `{Namespace.key}` with that message in the given locale (or `{site.key}` with the
 * site config), so model-facing text names things the way the site shows them. An unknown key is
 * left as written.
 */
export function fillUiStrings(text: string, locale: string): string {
  const messages = MESSAGES[locale] ?? MESSAGES[routing.defaultLocale];
  return text.replace(/\{(\w+)\.(\w+)\}/g, (placeholder, namespace: string, key: string) => {
    const value = namespace === "site" ? (SITE as unknown as Record<string, unknown>)[key] : messages[namespace]?.[key];
    return typeof value === "string" ? value : placeholder;
  });
}
