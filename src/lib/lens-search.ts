import type { ApertureValue, Lens } from "./types";
import { getAliasesForBrand } from "./brand-aliases";

// ---------------------------------------------------------------------------
// Normalisation & tokenisation
// ---------------------------------------------------------------------------

/** Unicode Han/Hiragana/Katakana ranges kept intact during normalisation. */
const CJK_RANGE = "\u4e00-\u9fff\u3400-\u4dbf\u3040-\u309f\u30a0-\u30ff";

/** Private placeholder for digit-between-dots protection during normalisation. */
const DOT_SENTINEL = "\u0001";

/**
 * Characters that are neither ASCII alphanumeric, the dot sentinel, nor CJK —
 * treated as delimiters. Note: real dots are still delimiters; only the
 * sentinel (which has temporarily replaced digit-dot-digit sequences) is kept.
 */
const DELIMITER_PATTERN = new RegExp(`[^a-z0-9${DOT_SENTINEL}${CJK_RANGE}]+`, "gu");

/**
 * Normalise a single string into a clean, lowercase searchable form.
 * - Applies NFKD decomposition so accented / diacritic characters fold to ASCII
 *   (e.g. Voigtländer → voigtlander).
 * - Preserves CJK characters so Chinese/Japanese queries work.
 * - Preserves dots between digits so decimal aperture / focal values remain a
 *   single semantic token (e.g. "F2.8" → "f2.8", not "f2 8"). Dots in other
 *   positions are still treated as delimiters.
 * - Collapses any non-alphanumeric, non-CJK run into a single space.
 */
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

/**
 * Split a normalised string into individual tokens.
 * CJK characters are each treated as their own token (no word-boundary
 * concept in CJK), while ASCII alphanumeric runs are split on spaces.
 */
export function tokenize(normalised: string): string[] {
  if (!normalised) return [];
  const tokens: string[] = [];
  for (const part of normalised.split(" ")) {
    if (!part) continue;
    if (/[\u4e00-\u9fff\u3400-\u4dbf\u3040-\u309f\u30a0-\u30ff]/.test(part)) {
      for (const ch of part) {
        tokens.push(ch);
      }
      if (part.length > 1) tokens.push(part);
    } else {
      tokens.push(part);
    }
  }
  return tokens;
}

/**
 * Expand a query token at the letter→digit boundary so that compound inputs
 * like "xf35" behave as if the user had typed "xf 35". Single-letter prefixes
 * (e.g. "f1.4") are kept whole because they are canonical tokens, not compounds.
 */
function expandCompoundToken(token: string): string[] {
  const match = token.match(/^([a-z]{2,})(\d.*)$/);
  return match ? [match[1], match[2]] : [token];
}

/**
 * Tokenise a user query. Applies the letter→digit expansion on top of the
 * shared tokenizer so that query-side compound splitting is explicit and the
 * index path (buildLensSearchIndex) stays untouched.
 */
export function tokenizeQuery(normalised: string): string[] {
  return tokenize(normalised).flatMap(expandCompoundToken);
}

// ---------------------------------------------------------------------------
// Aperture synthetic token generation
// ---------------------------------------------------------------------------
//
// Why only aperture (and not focal)? With the normalisation fix above, model
// strings preserve decimal dots, so "XF 35mm F1.4 R" → tokens
// ["xf", "35mm", "f1.4", "r"]. Focal numbers ("35", "35mm") and dotted
// apertures ("f1.4") are therefore already present in the model bucket.
//
// Aperture still needs synthetic tokens for the "no-dot" writing style
// (e.g. "f28" for f/2.8) which users commonly type but which is not a
// substring of the canonical "f2.8" form.

function apertureNums(v: ApertureValue): number[] {
  return Array.isArray(v) ? v : [v];
}

function formatApertureNum(n: number): string {
  return n % 1 === 0 ? String(n) : n.toFixed(1).replace(/\.?0+$/, "");
}

function apertureTokens(lens: Lens): string[] {
  const tokens: string[] = [];
  for (const n of apertureNums(lens.maxAperture)) {
    const s = formatApertureNum(n);
    const noDot = s.replace(".", "");
    if (noDot !== s) {
      // Only emit no-dot variants; dotted forms ("2.8", "f2.8") are covered
      // by the model bucket after the normalisation fix.
      tokens.push(noDot, `f${noDot}`);
    }
  }
  return tokens;
}

// ---------------------------------------------------------------------------
// Index structure
// ---------------------------------------------------------------------------

interface TokenBucket {
  brand: string[];
  alias: string[];
  series: string[];
  model: string[];
  aperture: string[];
}

interface SearchableLensEntry {
  lens: Lens;
  buckets: TokenBucket;
}

export type LensSearchIndex = SearchableLensEntry[];

function normTokens(text: string): string[] {
  return tokenize(normalizeLensSearchText(text));
}

function createSearchableLensEntry(lens: Lens): SearchableLensEntry {
  const aliases = [lens.brand, ...getAliasesForBrand(lens.brand)];
  const aliasTokens = aliases.flatMap((a) => normTokens(a));

  const buckets: TokenBucket = {
    brand: normTokens(lens.brand),
    alias: aliasTokens,
    series: normTokens(lens.series ?? ""),
    model: normTokens(lens.model),
    aperture: apertureTokens(lens).map((t) => normalizeLensSearchText(t)),
  };

  return { lens, buckets };
}

export function buildLensSearchIndex(lenses: Lens[]): LensSearchIndex {
  return lenses.map(createSearchableLensEntry);
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

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

  // Prefer complete numeric chunks such as "40" in "40mm" over broader
  // numeric prefixes such as "40" in "400mm".
  if (/^\d+$/.test(query)) {
    return /\D/.test(nextChar);
  }

  return true;
}

function matchStrength(tokens: string[], query: string): MatchStrength {
  if (tokens.includes(query)) return "exact";
  if (tokens.some((t) => isBoundaryPrefix(t, query))) return "boundaryPrefix";
  if (tokens.some((t) => t.startsWith(query))) return "wordPrefix";
  if (tokens.some((t) => t.includes(query))) return "includes";
  return "none";
}

const WEIGHTS: Record<keyof TokenBucket, Record<MatchStrength, number>> = {
  model:    { exact: 600, boundaryPrefix: 520, wordPrefix: 450, includes: 280, none: 0 },
  brand:    { exact: 260, boundaryPrefix: 220, wordPrefix: 200, includes: 120, none: 0 },
  alias:    { exact: 240, boundaryPrefix: 200, wordPrefix: 180, includes: 110, none: 0 },
  series:   { exact: 210, boundaryPrefix: 180, wordPrefix: 160, includes: 110, none: 0 },
  aperture: { exact: 190, boundaryPrefix: 180, wordPrefix: 170, includes: 140, none: 0 },
};

/**
 * Soft preference for first-party (Fujifilm) lenses. X-Glass is framed
 * around the Fuji X-mount ecosystem, so on near-ties Fuji lenses should
 * appear first. Small enough (~4-25% of a typical total score) to avoid
 * overriding clearly better third-party matches.
 */
const FIRST_PARTY_BRAND = "fujifilm";
const FIRST_PARTY_BONUS = 50;

/**
 * Minimum absolute total score a result must reach to show up in
 * auto-suggest. Roughly equivalent to a single wordPrefix-on-aperture
 * match, i.e. the weakest result we would still consider relevant.
 */
const MIN_ABSOLUTE_SCORE = 200;

/**
 * Minimum fraction of the best result's score a candidate must reach
 * to show up alongside it. Prunes the long tail of weak includes-only
 * matches from cluttering the dropdown when better results exist.
 */
const MIN_RELATIVE_SCORE_RATIO = 0.4;

/**
 * Score a single query token across all buckets. Returns 0 if nothing matches.
 */
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

/**
 * Score a multi-token query against a lens with AND semantics — every query
 * token must match at least one bucket, otherwise the lens is excluded.
 * First-party lenses get a small constant bonus on top of the raw match
 * score so they win near-ties against third-party lenses.
 */
function scoreLens(entry: SearchableLensEntry, queryTokens: string[]): number {
  let total = 0;
  for (const qt of queryTokens) {
    const s = scoreToken(entry.buckets, qt);
    if (s === 0) return 0;
    total += s;
  }
  if (entry.lens.brand === FIRST_PARTY_BRAND) {
    total += FIRST_PARTY_BONUS;
  }
  return total;
}

// ---------------------------------------------------------------------------
// Public search API
// ---------------------------------------------------------------------------

export function searchLensIndex(
  index: LensSearchIndex,
  query: string,
  limit = 8
): Lens[] {
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
      if (b.score !== a.score) return b.score - a.score;
      const aLen = a.entry.buckets.model.join("").length;
      const bLen = b.entry.buckets.model.join("").length;
      if (aLen !== bLen) return aLen - bLen;
      return a.entry.lens.model.localeCompare(b.entry.lens.model);
    })
    .slice(0, limit)
    .map((item) => item.entry.lens);
}

export function searchLenses(
  lenses: Lens[],
  query: string,
  limit = 8
): Lens[] {
  return searchLensIndex(buildLensSearchIndex(lenses), query, limit);
}
