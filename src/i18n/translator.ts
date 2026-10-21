import type { useTranslations } from "next-intl";
import type messages from "@/messages/en.json";

/** A translator scoped to one namespace, as `useTranslations` and `getTranslations` return it. */
export type NamespaceTranslator<N extends keyof typeof messages> = ReturnType<typeof useTranslations<N>>;
