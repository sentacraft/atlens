import { createTranslator } from "next-intl";
import { z } from "zod";
import en from "@/messages/en.json";
import zh from "@/messages/zh.json";
import type { Lens } from "@/lib/types";
import { buildSpecGroups, buildSpecGroupLabels, resolveSpecGroups, rowPlainText } from "@/lib/lens/spec-groups";
import { getLensUrl } from "@/lib/lens/lens";
import { getLensImageUrl } from "@/lib/lens/image";
import { pickPriceEntry, formatPriceForReport } from "@/lib/lens/pricing";
import { MAX_FEEDBACK_SEARCH_QUERY_LENGTH } from "./feedback-contract";
import { createFeedbackDraft, type FeedbackField } from "./feedback-draft";

export const FEEDBACK_SPEC_FIELDS = [
  "focalLength", "focalLengthEquiv", "maxAperture", "minAperture", "maxTStop", "minTStop", "angleOfView",
  "apertureBladeCount", "lensConfiguration", "weight", "dimensions", "filterSize", "lensMaterial", "af",
  "focusMotor", "internalFocusing", "minFocusDist", "maxMagnification", "ois", "wr", "apertureRing",
  "powerZoom", "internalZoom", "releaseYear", "accessories", "officialLink", "productImage", "price",
] as const;

export const prepareFeedbackInputSchema = z.object({
  type: z.enum(["general", "data_issue"]),
  description: z.string().trim().min(1).max(2000).describe("The feedback to send, in the reply language. Preserve uncertainty; do not include the whole chat."),
  lensRef: z.string().max(64).nullable().describe("A recalled lens ref, or null. Look up the lens first."),
  field: z.enum(FEEDBACK_SPEC_FIELDS).nullable(),
  suggestedCorrection: z.string().max(200).nullable().describe("Only a correction the user supplied or that was verified; otherwise null."),
  searchQuery: z.string().trim().min(1).max(MAX_FEEDBACK_SEARCH_QUERY_LENGTH).nullable().describe("Only for a missing lens: its name or actual search terms, never the full prompt. Otherwise null."),
  wantsReply: z.boolean().describe("true only if the user explicitly asks for a reply or progress updates; otherwise false."),
  replyContact: z.string().trim().max(300).nullable().describe("Only a contact the user explicitly specified; otherwise null. The app prefills the account email."),
});
export type PrepareFeedbackInput = z.infer<typeof prepareFeedbackInputSchema>;

function translators(locale: string) {
  const messages = locale === "zh" ? zh : en;
  return {
    detail: createTranslator({ locale, messages, namespace: "LensDetail" }),
    pricing: createTranslator({ locale, messages, namespace: "Pricing" }),
  };
}

export function buildFeedbackFields(lens: Lens, locale: string): FeedbackField[] {
  const { detail: t, pricing: p } = translators(locale);
  const groups = resolveSpecGroups(buildSpecGroups(buildSpecGroupLabels(t)), lens);
  const values = { yes: t("yes"), no: t("no"), partial: t("partial"), unknown: t("unknown"), missing: t("missing") };
  const price = pickPriceEntry(lens.pricing, locale);
  const url = getLensUrl(lens, locale);
  return [
    ...groups.flatMap((group) => group.rows.map((row) => ({ label: row.label, currentValue: rowPlainText(row, values), group: group.label }))),
    ...(price ? [{ label: p("fieldLabel"), currentValue: formatPriceForReport(price, p), group: p("groupLabel") }] : []),
    ...(url ? [{ label: t("fieldOfficialLink"), currentValue: url, group: t("fieldGroupMedia") }] : []),
    { label: t("fieldLensImage"), currentValue: getLensImageUrl(lens.id), group: t("fieldGroupMedia"), hideCurrentValue: true },
  ];
}

export function prepareFeedback(input: PrepareFeedbackInput, lens: Lens | undefined, locale: string, brand: string) {
  if (input.type === "data_issue" && input.searchQuery) {throw new Error("searchQuery is only for a missing lens, with type general.");}
  if (input.field && (!lens || input.type !== "data_issue")) {throw new Error("A spec field requires a recalled lens and type data_issue.");}
  if (input.suggestedCorrection && input.type !== "data_issue") {throw new Error("A data correction requires type data_issue.");}
  const fields = lens ? buildFeedbackFields(lens, locale) : [];
  const { detail: t, pricing: p } = translators(locale);
  const field = input.field === "price" ? p("fieldLabel") : input.field === "officialLink" ? t("fieldOfficialLink") : input.field === "productImage" ? t("fieldLensImage") : input.field ? t(input.field) : undefined;
  const selected = fields.find((entry) => entry.label === field);
  return createFeedbackDraft({
    type: input.type, description: input.description, wantsReply: input.wantsReply, replyContact: input.replyContact,
    fields: input.type === "data_issue" ? (field && !selected ? [...fields, { label: field }] : fields) : [],
    context: {
      ...(lens ? { lensId: lens.id, lensModel: lens.model, lensBrand: brand } : {}),
      ...(field ? { field, currentValue: selected?.currentValue } : {}),
      ...(input.suggestedCorrection ? { suggestedCorrection: input.suggestedCorrection } : {}),
      ...(input.searchQuery ? { searchQuery: input.searchQuery } : {}),
    },
  });
}
