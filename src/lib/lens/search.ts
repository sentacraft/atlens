import type { ApertureValue, Lens } from "@/lib/types";

/** The fields search reads, so callers can pass a slim lens list instead of full records. */
export type SearchableLens = Pick<
  Lens,
  "id" | "brand" | "series" | "model" | "focalLengthMin" | "focalLengthMax" | "maxAperture"
>;
import enMessages from "@/messages/en.json";
import zhMessages from "@/messages/zh.json";

const EN_BRAND_NAMES = enMessages.Brands as Record<string, string>;
const ZH_BRAND_NAMES = zhMessages.Brands as Record<string, string>;

// Variant spellings ("Fuji", "Fujinon") are deliberately not aliases.
function getBrandSearchAliases(brandKey: string): string[] {
  return [EN_BRAND_NAMES[brandKey], ZH_BRAND_NAMES[brandKey]].filter(Boolean);
}

const CJK_RANGE = "\u4e00-\u9fff\u3400-\u4dbf\u3040-\u309f\u30a0-\u30ff";

const DOT_SENTINEL = "\u0001";

const DELIMITER_PATTERN = new RegExp(`[^a-z0-9${DOT_SENTINEL}${CJK_RANGE}]+`, "gu");

// Dots between digits survive so "F2.8" stays one token.
export function normalizeLensSearchText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip combining diacritical marks
    .toLowerCase()
    .replace(/(\d)\.(\d)/g, `$1${DOT_SENTINEL}$2`) // protect decimal dots
    .replace(DELIMITER_PATTERN, " ") // now "." (not between digits) is a delimiter
    .replace(new RegExp(DOT_SENTINEL, "g"), ".") // restore decimal dots
    .trim()
    .replace(/\s+/g, " ");
}

function brandKey(value: string): string {
  return normalizeLensSearchText(value).replace(/ /g, "");
}

const catalogBrandByKey = new Map(
  Object.keys(EN_BRAND_NAMES).flatMap((slug) =>
    [slug, ...getBrandSearchAliases(slug)].map((name) => [brandKey(name), slug] as const),
  ),
);

/** A catalog brand's slug when the input names one; otherwise the trimmed input. */
export function normalizeBrand(input: string): string {
  const trimmed = input.trim();
  return catalogBrandByKey.get(brandKey(trimmed)) ?? trimmed;
}

export function tokenize(normalised: string): string[] {
  if (!normalised) {
    return [];
  }
  const tokens: string[] = [];
  for (const part of normalised.split(" ")) {
    if (!part) {
      continue;
    }
    if (/[\u4e00-\u9fff\u3400-\u4dbf\u3040-\u309f\u30a0-\u30ff]/.test(part)) {
      for (const ch of part) {
        tokens.push(ch);
      }
      if (part.length > 1) {
        tokens.push(part);
      }
    } else {
      tokens.push(part);
    }
  }
  return tokens;
}

// "xf35" splits like "xf 35"; single-letter prefixes such as "f1.4" stay whole.
function expandCompoundToken(token: string): string[] {
  const match = token.match(/^([a-z]{2,})(\d.*)$/);
  return match ? [match[1], match[2]] : [token];
}

export function tokenizeQuery(normalised: string): string[] {
  return tokenize(normalised).flatMap(expandCompoundToken);
}

// Only apertures need synthetic tokens, for the no-dot style ("f28" for f/2.8).

function apertureNums(v: ApertureValue): number[] {
  return Array.isArray(v) ? v : [v];
}

function formatApertureNum(n: number): string {
  return n % 1 === 0 ? String(n) : n.toFixed(1).replace(/\.?0+$/, "");
}

// Zoom ranges typed without the hyphen ("1850").
function focalRangeTokens(lens: SearchableLens): string[] {
  if (lens.focalLengthMin === lens.focalLengthMax) {
    return [];
  }
  return [`${lens.focalLengthMin}${lens.focalLengthMax}`];
}

function apertureTokens(lens: SearchableLens): string[] {
  const tokens: string[] = [];
  if (lens.maxAperture === undefined) {
    return tokens;
  }
  for (const n of apertureNums(lens.maxAperture)) {
    const s = formatApertureNum(n);
    const noDot = s.replace(".", "");
    if (noDot !== s) {
      tokens.push(noDot, `f${noDot}`);
    }
  }
  return tokens;
}

interface TokenBucket {
  brand: string[];
  alias: string[];
  series: string[];
  model: string[];
  aperture: string[];
}

interface SearchableLensEntry<T extends SearchableLens> {
  lens: T;
  buckets: TokenBucket;
}

export type LensSearchIndex<T extends SearchableLens = Lens> = SearchableLensEntry<T>[];

function normTokens(text: string): string[] {
  return tokenize(normalizeLensSearchText(text));
}

function createSearchableLensEntry<T extends SearchableLens>(lens: T): SearchableLensEntry<T> {
  const aliasTokens = getBrandSearchAliases(lens.brand).flatMap(normTokens);

  const buckets: TokenBucket = {
    brand: normTokens(lens.brand),
    alias: aliasTokens,
    series: normTokens(lens.series ?? ""),
    model: [...normTokens(lens.model), ...focalRangeTokens(lens)],
    aperture: apertureTokens(lens).map((t) => normalizeLensSearchText(t)),
  };

  return { lens, buckets };
}

export function buildLensSearchIndex<T extends SearchableLens>(lenses: T[]): LensSearchIndex<T> {
  return lenses.map(createSearchableLensEntry);
}

type MatchStrength =
  | "exact"
  | "boundaryPrefix"
  | "wordPrefix"
  | "includes"
  | "none";

function isBoundaryPrefix(token: string, query: string): boolean {
  if (!token.startsWith(query) || token.length === query.length) {
    return false;
  }

  const nextChar = token[query.length];

  if (/^\d+$/.test(query)) {
    return /\D/.test(nextChar);

  }

  // Alpha→alpha is not a boundary: "art" must not match "artisans".
  return /\d/.test(nextChar);
}

function matchStrength(tokens: string[], query: string): MatchStrength {
  if (tokens.includes(query)) {
    return "exact";
  }
  if (tokens.some((t) => isBoundaryPrefix(t, query))) {
    return "boundaryPrefix";
  }
  if (tokens.some((t) => t.startsWith(query))) {
    return "wordPrefix";
  }
  if (tokens.some((t) => t.includes(query))) {
    return "includes";
  }
  return "none";
}

const WEIGHTS: Record<keyof TokenBucket, Record<MatchStrength, number>> = {
  model:    { exact: 600, boundaryPrefix: 520, wordPrefix: 450, includes: 280, none: 0 },
  brand:    { exact: 260, boundaryPrefix: 220, wordPrefix: 200, includes: 120, none: 0 },
  alias:    { exact: 240, boundaryPrefix: 200, wordPrefix: 180, includes: 110, none: 0 },
  series:   { exact: 210, boundaryPrefix: 180, wordPrefix: 160, includes: 110, none: 0 },
  aperture: { exact: 190, boundaryPrefix: 180, wordPrefix: 170, includes: 140, none: 0 },
};

// Small enough not to override a clearly better third-party match.
const FIRST_PARTY_BRAND = "fujifilm";
const FIRST_PARTY_BONUS = 50;

const MIN_ABSOLUTE_SCORE = 200;

const MIN_RELATIVE_SCORE_RATIO = 0.4;

function scoreToken(buckets: TokenBucket, queryToken: string): number {
  let best = 0;
  for (const key of Object.keys(WEIGHTS) as (keyof TokenBucket)[]) {
    const strength = matchStrength(buckets[key], queryToken);
    if (strength !== "none") {
      best = Math.max(best, WEIGHTS[key][strength]);
    }
  }
  return best;
}

function scoreLens(entry: SearchableLensEntry<SearchableLens>, queryTokens: string[]): number {
  let total = 0;
  for (const qt of queryTokens) {
    const s = scoreToken(entry.buckets, qt);
    if (s === 0) {
      return 0;
    }
    total += s;
  }
  if (entry.lens.brand === FIRST_PARTY_BRAND) {
    total += FIRST_PARTY_BONUS;
  }
  return total;
}

export function searchLensIndex<T extends SearchableLens>(
  index: LensSearchIndex<T>,
  query: string,
  limit = 8
): T[] {
  const queryTokens = tokenizeQuery(normalizeLensSearchText(query));

  if (queryTokens.length === 0) {
    return [];

  }

  const scored = index
    .map((entry) => ({
      entry,
      score: scoreLens(entry, queryTokens),
    }))
    .filter((item) => item.score >= MIN_ABSOLUTE_SCORE);

  if (scored.length === 0) {
    return [];

  }

  const bestScore = scored.reduce((max, item) => Math.max(max, item.score), 0);
  const relativeFloor = bestScore * MIN_RELATIVE_SCORE_RATIO;

  return scored
    .filter((item) => item.score >= relativeFloor)
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      const aLen = a.entry.buckets.model.join("").length;
      const bLen = b.entry.buckets.model.join("").length;
      if (aLen !== bLen) {
        return aLen - bLen;
      }
      return a.entry.lens.model.localeCompare(b.entry.lens.model);
    })
    .slice(0, limit)
    .map((item) => item.entry.lens);
}

export function searchLenses<T extends SearchableLens>(
  lenses: T[],
  query: string,
  limit = 8
): T[] {
  return searchLensIndex(buildLensSearchIndex(lenses), query, limit);
}
