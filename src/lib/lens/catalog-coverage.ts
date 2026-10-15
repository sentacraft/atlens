import coverageMeta from "@/data/coverage-meta.json";
import type { Mount } from "@/lib/types";

export type CoverageState = boolean | "planned" | "partial" | "n/a";

export interface BrandCoverage {
  active: CoverageState;
  discontinued: CoverageState;
  cinema: CoverageState;
  notes: string;
}

/** Which kinds of lenses each brand's coverage includes, per mount, in display order. */
export const CATALOG_COVERAGE: Record<Mount, Record<string, BrandCoverage>> = {
  X: coverageMeta.x as Record<string, BrandCoverage>,
  G: coverageMeta.g as Record<string, BrandCoverage>,
};
