import "server-only";

import { createTranslator } from "next-intl";
import type { Locale } from "@/i18n/routing";
import en from "@/messages/en.json";
import zh from "@/messages/zh.json";

const MESSAGES = { en, zh } satisfies Record<Locale, unknown>;

interface AuthEmail {
  subject: string;
  text: string;
  html: string;
}

function translator(locale: Locale) {
  return createTranslator({ locale, messages: MESSAGES[locale], namespace: "AuthEmail" });
}

export function signInCodeEmail(locale: Locale, otp: string): AuthEmail {
  const t = translator(locale);
  const body = (strong: (chunks: string) => string) => t.markup("signInBody", { otp, strong });
  return {
    subject: t("signInSubject"),
    text: `${body((chunks) => chunks)}\n${t("signInExpiry")}`,
    html: `<p>${body((chunks) => `<strong>${chunks}</strong>`)}</p><p>${t("signInExpiry")}</p>`,
  };
}

export function deleteAccountEmail(locale: Locale, url: string): AuthEmail {
  const t = translator(locale);
  return {
    subject: t("deleteSubject"),
    text: `${t("deleteBody")}\n\n${url}\n\n${t("deleteFooter")}`,
    html: `<p>${t("deleteBody")}</p><p><a href="${url}">${t("deleteLink")}</a></p><p>${t("deleteFooter")}</p>`,
  };
}
