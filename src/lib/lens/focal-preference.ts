import type { FocalReference } from "@/lib/lens/lens";

const KEY = "atlens_focal_reference_v1";

export function readFocalReferencePreference(): FocalReference {
  try {
    return window.localStorage.getItem(KEY) === "actual" ? "actual" : "equivalent";
  } catch {
    return "equivalent";
  }
}

export function writeFocalReferencePreference(reference: FocalReference): void {
  try {
    window.localStorage.setItem(KEY, reference);
  } catch {}
}
