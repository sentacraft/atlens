import en from "@/messages/en.json";
import zh from "@/messages/zh.json";

function brandKey(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[\s\-_.]+/g, "");
}

const catalogBrands = new Map<string, string>();
for (const [slug, enName] of Object.entries(en.Brands)) {
  catalogBrands.set(brandKey(slug), slug);
  catalogBrands.set(brandKey(enName), slug);
}
for (const [slug, zhName] of Object.entries(zh.Brands)) {
  catalogBrands.set(brandKey(zhName), slug);
}

/** A catalog brand's slug when the input names one; otherwise the trimmed input. */
export function normalizeBrand(input: string): string {
  const trimmed = input.trim();
  return catalogBrands.get(brandKey(trimmed)) ?? trimmed;
}
