import { readFileSync } from "node:fs";
import type { Lens } from "../../src/lib/types";

const catalog: Lens[] = JSON.parse(readFileSync(new URL("../../src/data/lenses.json", import.meta.url), "utf8"));

export const stillsLenses = catalog.filter((lens) => !lens.isCine);
export const stillsBrands = new Set(stillsLenses.map((lens) => lens.brand));
export const datedLenses = stillsLenses.flatMap((lens) =>
  lens.releaseYear === undefined ? [] : [{ brand: lens.brand, year: lens.releaseYear }],
);

export const sigmaLenses = stillsLenses.filter((lens) => lens.brand === "sigma");
export const sigmaYears = datedLenses.filter((lens) => lens.brand === "sigma").map((lens) => lens.year);

export function yearSpan(years: number[]) {
  return `${Math.min(...years)}–${Math.max(...years)}`;
}
