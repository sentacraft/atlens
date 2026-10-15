"use client";

import { useLocale, useTranslations } from "next-intl";
import type { Body } from "@/lib/body/schema";

/** "APS-C · 4020 万像素 · 机身防抖 · 防滴防尘 · 557g" for a catalog body. */
export function BodySpecs({ body }: { body: Body }) {
  const t = useTranslations("Profile");
  const m = useTranslations("MountSwitcher");
  const l = useTranslations("LensList");
  // Chinese counts pixels in 万 (10,000s): 40.2MP is 4020 万.
  const megapixels = useLocale() === "zh" ? Math.round(body.megapixels * 100) : body.megapixels;
  const parts = [
    body.mount === "X" ? m("xCaption") : m("gfxCaption"),
    t("bodyMegapixels", { value: String(megapixels) }),
    body.ibis ? t("bodyIbis") : null,
    body.weatherSealed ? l("featureWr") : null,
    body.weightGrams ? `${body.weightGrams}g` : null,
  ].filter(Boolean);
  return <>{parts.join(" · ")}</>;
}
