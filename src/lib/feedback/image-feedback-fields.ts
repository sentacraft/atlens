import type { NamespaceTranslator } from "@/i18n/translator";
import { getLensImageUrl } from "@/lib/lens/image";
import { getTechnicalImages, technicalImageShortLabel } from "@/lib/lens/technical-images";
import type { Lens } from "@/lib/types";
import type { FeedbackField } from "./feedback-draft";

export function buildImageFeedbackFields(lens: Pick<Lens, "id" | "images">, t: NamespaceTranslator<"LensDetail">): FeedbackField[] {
  const group = t("fieldGroupMedia");
  const mtfLabel = t("fieldMtf");
  const charts = getTechnicalImages(lens, "mtf");
  const captions = charts.map(technicalImageShortLabel);
  return [
    { label: t("fieldLensPhotos"), group },
    { label: t("fieldOpticalDiagram"), group },
    { label: mtfLabel, group },
    ...charts.map((image, index) => {
      const caption = captions[index];
      const number = t("opticalImages.imageNumber", { number: String(index + 1) });
      const name = !caption ? number : captions.indexOf(caption) !== captions.lastIndexOf(caption) ? `${caption} (${number})` : caption;
      return { label: `${mtfLabel} · ${name}`, group, currentValue: getLensImageUrl(lens.id, image.id), hideCurrentValue: true };
    }),
  ];
}
