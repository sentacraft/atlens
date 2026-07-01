import {
  getLensUrl,
  isZoom,
  leadingValue,
  lensHasFeature,
  sortLenses,
  type FilterFeatureKey,
  type SortKey,
} from "@/lib/lens/lens";
import { focalEquiv } from "@/lib/lens/format";
import { getLensesByMount } from "@/lib/lens/data";
import { deriveSpecialty } from "@/lib/lens/specialty";
import { pickPriceEntry } from "@/lib/lens/pricing";
import type { ApertureValue, Lens, Mount, OpticalTrait } from "@/lib/types";

// The Copilot recall layer — distinct from the UX filter layer (filterLenses /
// FilterState) and the lexical layer (searchLensIndex). It takes objective
// constraints produced by the LLM and returns a three-way partition. It is the
// only recall path that supports numeric thresholds (weight / aperture / price)
// and semantic focal predicates; the UX filter is categorical-only.

// Optical traits whose rendering is unusual enough that they should never
// surface for a generic query — only when the user explicitly asks by naming
// one in `opticalTraits`. Macro is deliberately absent: a macro lens renders
// normally and is a valid everyday pick.
const SPECIALTY_TRAITS: readonly OpticalTrait[] = [
  "fisheye",
  "tilt",
  "shift",
  "anamorphic",
  "probe",
];

export type SortField = SortKey | "price";

export interface LensConstraints {
  brands?: string[];
  type?: "prime" | "zoom";
  focus?: "auto" | "manual";
  usage?: "photo" | "cine";
  features?: FilterFeatureKey[];
  opticalTraits?: OpticalTrait[];
  // Full-frame-equivalent millimetres. The lens must be able to shoot at each.
  coversFocals?: number[];
  // Full-frame-equivalent millimetres. The lens's whole range must sit inside.
  focalWithin?: [number | null, number | null];
  maxWeightG?: number;
  // f-number ceilings at each zoom end (a smaller number = wider).
  maxApertureF?: { wide?: number; tele?: number };
  // In the locale's currency (zh → CNY, en → USD).
  maxPrice?: number;
  sortBy?: SortField;
  sortDir?: "asc" | "desc";
}

// The lens as the model (and, later, the frontend) sees it: a compact,
// presentation-agnostic projection of the fat `Lens` domain object.
//
// This is a deliberate seam. Today it shapes the tool output the LLM reasons
// over (token economy + not leaking the internal pricing/pipeline schema). It
// is ALSO the contract a v2 frontend will render lens cards from — letting the
// model do prose/judgment while the UI renders specs from this data instead of
// parsing the model's markdown tables. Keep it presentation-agnostic and
// card-complete (e.g. `id` stays so a card can link to the detail page); when
// cards land, they consume this, not a re-fetch. See the runtime plan's
// output-decoupling section.
//
// Verbatim fields are Pick'd from Lens so their types can't drift; the rest are
// intentionally derived (flattened price, equiv focal, one official link).
//
// This is a scoped, reduced cousin of the app-wide `ResolvedLens` that the
// 2026-06-01-locale-data-cleanup plan (B 方案) deferred: same idea (single
// price/link, no translations) but trimmed for the model boundary, and it still
// locale-picks at point of use (pickPriceEntry / getLensUrl) rather than being a
// globally resolved type. If that ResolvedLens ever lands, project from it here
// instead of re-picking. RecalledLens is NOT ResolvedLens.
export type RecalledLens = Pick<Lens, "id" | "brand" | "series" | "model" | "af" | "ois" | "wr"> & {
  focalNativeMm: [number, number];
  focalEquivMm: [number, number];
  maxAperture: ApertureValue | null;
  weightG: number | null;
  opticalTraits: OpticalTrait[];
  isCine: boolean;
  price: { amount: number; currency: "CNY" | "USD"; condition: "new" | "used" } | null;
  officialLink: string | null;
};

export interface RecallResult {
  matches: RecalledLens[];
  maybe: { lens: RecalledLens; missingFields: string[] }[];
  totalMatched: number;
}

type Verdict =
  | { kind: "match" }
  | { kind: "exclude" }
  | { kind: "maybe"; missingFields: string[] };

const EXCLUDE: Verdict = { kind: "exclude" };

function evaluate(lens: Lens, c: LensConstraints, locale: string): Verdict {
  if (c.brands?.length && !c.brands.includes(lens.brand)) {
    return EXCLUDE;
  }
  if (c.type && c.type !== (isZoom(lens) ? "zoom" : "prime")) {
    return EXCLUDE;
  }
  if (c.focus === "auto" && !lens.af) {
    return EXCLUDE;
  }
  if (c.focus === "manual" && lens.af) {
    return EXCLUDE;
  }

  const { isCine, opticalTraits } = deriveSpecialty(lens);
  const usage = c.usage ?? "photo";
  if (usage === "photo" && isCine) {
    return EXCLUDE;
  }
  if (usage === "cine" && !isCine) {
    return EXCLUDE;
  }

  const requested = c.opticalTraits ?? [];
  // Positive filter: when traits are requested, the lens must have at least one.
  if (requested.length && !requested.some((t) => opticalTraits.includes(t))) {
    return EXCLUDE;
  }
  // Specialty guard: a lens carrying a specialty trait the user did not ask for
  // never surfaces (a fisheye must not answer "a light lens").
  for (const trait of opticalTraits) {
    if (SPECIALTY_TRAITS.includes(trait) && !requested.includes(trait)) {
      return EXCLUDE;
    }
  }

  if (c.features?.length) {
    for (const field of c.features) {
      if (!lensHasFeature(lens, field)) {
        return EXCLUDE;
      }
    }
  }

  // Rounded FF-equivalent mm — the same value the model is shown (focalEquiv),
  // so what gets filtered matches what gets displayed. The model only ever
  // queries coarse round focals, so sub-mm precision would be noise.
  const equivMin = focalEquiv(lens.focalLengthMin, lens.mount);
  const equivMax = focalEquiv(lens.focalLengthMax, lens.mount);
  if (c.coversFocals?.length) {
    for (const point of c.coversFocals) {
      if (!(equivMin <= point && point <= equivMax)) {
        return EXCLUDE;
      }
    }
  }
  if (c.focalWithin) {
    const [lo, hi] = c.focalWithin;
    if (lo != null && equivMin < lo) {
      return EXCLUDE;
    }
    if (hi != null && equivMax > hi) {
      return EXCLUDE;
    }
  }

  // Numeric thresholds — the only checks that can be indeterminate (missing
  // data). A miss never excludes silently; it demotes the lens to `maybe`.
  const missingFields: string[] = [];

  if (c.maxWeightG != null) {
    const weight = leadingValue(lens.weightG);
    if (weight == null) {
      missingFields.push("weightG");
    } else if (weight > c.maxWeightG) {
      return EXCLUDE;
    }
  }

  if (c.maxApertureF) {
    if (lens.maxAperture == null) {
      missingFields.push("maxAperture");
    } else {
      const [wideF, teleF] = apertureEnds(lens.maxAperture);
      if (c.maxApertureF.wide != null && wideF > c.maxApertureF.wide) {
        return EXCLUDE;
      }
      if (c.maxApertureF.tele != null && teleF > c.maxApertureF.tele) {
        return EXCLUDE;
      }
    }
  }

  if (c.maxPrice != null) {
    const selection = pickPriceEntry(lens.pricing, locale);
    if (!selection) {
      missingFields.push("price");
    } else if (selection.entry.price > c.maxPrice) {
      return EXCLUDE;
    }
  }

  return missingFields.length > 0 ? { kind: "maybe", missingFields } : { kind: "match" };
}

function apertureEnds(value: ApertureValue): [number, number] {
  return Array.isArray(value) ? [value[0], value[1]] : [value, value];
}

function sortRecalled(
  lenses: Lens[],
  key: SortField,
  dir: "asc" | "desc",
  locale: string,
): Lens[] {
  // Standard keys go through the shared sorter unchanged; only `price` needs the
  // locale-aware price lookup this module adds. Missing prices sort to the end so
  // a partial dataset never hides priced candidates up top.
  if (key !== "price") {
    return sortLenses(lenses, key, dir);
  }
  const priceOf = (lens: Lens) =>
    pickPriceEntry(lens.pricing, locale)?.entry.price ?? Number.POSITIVE_INFINITY;
  return [...lenses].sort((a, b) => {
    const delta = priceOf(a) - priceOf(b);
    return dir === "desc" ? -delta : delta;
  });
}

export function projectLens(lens: Lens, locale: string): RecalledLens {
  const selection = pickPriceEntry(lens.pricing, locale);
  const { isCine, opticalTraits } = deriveSpecialty(lens);

  return {
    id: lens.id,
    brand: lens.brand,
    series: lens.series,
    model: lens.model,
    focalNativeMm: [lens.focalLengthMin, lens.focalLengthMax],
    focalEquivMm: [focalEquiv(lens.focalLengthMin, lens.mount), focalEquiv(lens.focalLengthMax, lens.mount)],
    maxAperture: lens.maxAperture ?? null,
    weightG: leadingValue(lens.weightG) ?? null,
    af: lens.af,
    wr: lens.wr,
    ois: lens.ois,
    opticalTraits,
    isCine,
    price: selection
      ? {
          amount: selection.entry.price,
          currency: selection.entry.currency,
          condition: selection.condition,
        }
      : null,
    officialLink: getLensUrl(lens, locale) ?? null,
  };
}

export function recallLenses(
  mount: Mount,
  locale: string,
  constraints: LensConstraints,
): RecallResult {
  const lenses = getLensesByMount(mount, locale);
  const matched: Lens[] = [];
  const maybe: { lens: Lens; missingFields: string[] }[] = [];

  for (const lens of lenses) {
    const verdict = evaluate(lens, constraints, locale);
    if (verdict.kind === "match") {
      matched.push(lens);
    } else if (verdict.kind === "maybe") {
      maybe.push({ lens, missingFields: verdict.missingFields });
    }
  }

  const key = constraints.sortBy ?? "focalLength";
  const dir = constraints.sortDir ?? "asc";
  const sortedMatched = sortRecalled(matched, key, dir, locale);
  const sortedMaybe = sortRecalled(
    maybe.map((m) => m.lens),
    key,
    dir,
    locale,
  );
  const missingById = new Map(maybe.map((m) => [m.lens.id, m.missingFields]));

  return {
    matches: sortedMatched.map((lens) => projectLens(lens, locale)),
    maybe: sortedMaybe.map((lens) => ({
      lens: projectLens(lens, locale),
      missingFields: missingById.get(lens.id) ?? [],
    })),
    totalMatched: matched.length,
  };
}
