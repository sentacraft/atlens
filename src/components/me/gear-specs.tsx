"use client";

import { useTranslations } from "next-intl";
import type { Body } from "@/lib/body/schema";

/** A catalog body's spec line: format, megapixels, IBIS, weather sealing and weight. */
export function BodySpecs({ body }: { body: Body }) {
  const t = useTranslations("Profile");
  const m = useTranslations("MountSwitcher");
  const l = useTranslations("LensList");
  const parts = [
    body.mount === "X" ? m("xCaption") : m("gfxCaption"),
    t("bodyMegapixels", { value: body.megapixels }),
    body.ibis ? t("bodyIbis") : null,
    body.weatherSealed ? l("featureWr") : null,
    body.weightGrams ? `${body.weightGrams}g` : null,
  ].filter(Boolean);
  return <>{parts.join(" · ")}</>;
}
