import { lazy, Suspense, type ComponentProps } from "react";
import { useTranslations } from "next-intl";
import type Viewer from "./LensImageViewer";

const LensImageViewer = lazy(() => import("./LensImageViewer"));

export default function LocalizedLensImageViewer(props: Omit<ComponentProps<typeof Viewer>, "labels">) {
  const t = useTranslations("LensDetail");
  return (
    <Suspense fallback={<span role="status" className="sr-only">{t("galleryLoading")}</span>}>
      <LensImageViewer {...props} labels={{
        close: t("galleryClose"),
        previous: t("galleryPrevious"),
        next: t("galleryNext"),
        loading: t("galleryLoading"),
        error: t("galleryError"),
        hint: {
          mouse: t("galleryHint.mouse"),
          touch: t("galleryHint.touch"),
          mouseSingle: t("galleryHint.mouseSingle"),
          touchSingle: t("galleryHint.touchSingle"),
        },
      }} />
    </Suspense>
  );
}
