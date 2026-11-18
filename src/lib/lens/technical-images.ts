import missingNoteClauses from "@/data/technical-image-missing-notes.json";
import type { Lens, LensImageAsset } from "@/lib/types";

const missingOnly = new Set(missingNoteClauses);
const clauseBoundary = /(?<=[\u3002\uff01\uff1f\uff1b])\s*|(?<=[.!?;])\s+/u;
const endPunctuation = /[.!?;\u3002\uff01\uff1f\uff1b]$/u;

export function getTechnicalImageReadingNote(note: string | undefined) {
  if (!note) {return undefined;}
  const clauses = note.trim().split(clauseBoundary);
  const kept = clauses.filter((clause) => !missingOnly.has(clause.replace(endPunctuation, "")));
  if (kept.length === clauses.length) {return note;}
  return kept.reduce((text, clause) => text + (text && !/[\u3002\uff01\uff1f\uff1b]$/u.test(text) ? " " : "") + clause, "")
    .replace(/;$/u, ".").replace(/\uff1b$/u, "\u3002") || undefined;
}

export type TechnicalImageRole = Extract<LensImageAsset["role"], "mtf" | "optical-construction">;

export const TECHNICAL_IMAGE_PREVIEW_LIMIT = 2;

export function getTechnicalImages(lens: Pick<Lens, "images">, role: TechnicalImageRole) {
  return lens.images?.filter((image) => image.role === role) ?? [];
}

export function technicalImageFilter(preset: LensImageAsset["displayPreset"]) {
  if (preset === "invert-on-white") {return "invert(1) hue-rotate(180deg) saturate(0.6)";}
  if (preset === "white-background") {return "saturate(0.6)";}
  return undefined;
}
