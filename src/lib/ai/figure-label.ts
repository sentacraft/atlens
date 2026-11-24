import { createTranslator } from "next-intl";
import en from "@/messages/en.json";
import zh from "@/messages/zh.json";

/** The label a shown image carries ("图 2" / "Fig. 2"), the same one in the UI, the history and the model's context. */
export function figureLabel(locale: string, number: number): string {
  const translate = createTranslator({ locale: locale === "zh" ? "zh" : "en", messages: locale === "zh" ? zh : en, namespace: "AskIris.lensImages" } as never) as unknown as (key: "figure", values: { number: number }) => string;
  return translate("figure", { number });
}
