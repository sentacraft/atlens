import type { NamespaceTranslator } from "@/i18n/translator";
import { getLensImageUrl } from "@/lib/lens/image";
import { getTechnicalImages, technicalImageShortLabel } from "@/lib/lens/technical-images";
import type { Lens } from "@/lib/types";
import type { FeedbackField } from "./feedback-draft";

export function addLensFeedbackFields(fields: FeedbackField[], lens: Pick<Lens, "id" | "images">, officialUrl: string | undefined, t: NamespaceTranslator<"LensDetail">): FeedbackField[] {
  const optics = t("groupOptics");
  const product = t("fieldGroupProduct");
  const structure = t("lensConfiguration");
  const mtfLabel = t("fieldMtf");
  const charts = getTechnicalImages(lens, "mtf");
  const captions = charts.map(technicalImageShortLabel);
  const imageOptions = charts.map((image, index) => {
    const caption = captions[index];
    const number = t("opticalImages.imageNumber", { number: String(index + 1) });
    const label = !caption ? number : captions.indexOf(caption) !== captions.lastIndexOf(caption) ? `${caption} (${number})` : caption;
    return { label, value: getLensImageUrl(lens.id, image.id) };
  });
  const mtf: FeedbackField = { label: mtfLabel, group: optics, imageOptions };
  const description = t("fieldLensConfigurationHint");
  const withImages = fields.some((field) => field.label === structure)
    ? fields.flatMap((field) => field.label === structure ? [{ ...field, description }, mtf] : [field])
    : [...fields, { label: structure, group: optics, description }, mtf];
  return [
    { label: t("fieldLensImage"), group: product },
    ...(officialUrl ? [{ label: t("fieldOfficialLink"), group: product, currentValue: officialUrl }] : []),
    ...withImages,
  ];
}
