import { z } from "zod";
import { bodies } from "@/lib/body/data";
import type { Body } from "@/lib/body/schema";
import type { Mount } from "@/lib/types";

export const BODY_RESULT_LIMIT = 20;

export const bodyQuerySchema = z.object({
  names: z
    .array(z.string())
    .max(8)
    .nullish()
    .describe('Look bodies up by the name the user wrote, e.g. "X-T5" or "gfx100 ii". Other fields are ignored when set.'),
  mount: z
    .enum(["X", "G", "any"])
    .nullish()
    .describe("Defaults to the current mount; any searches both."),
  ibis: z.boolean().nullish(),
  minIbisStops: z.number().positive().nullish().describe("At least this many CIPA stops."),
  subjectDetectionAF: z.boolean().nullish().describe("Detects animals, birds, vehicles and so on, beyond face and eye."),
  weatherSealed: z.boolean().nullish(),
  builtInFlash: z.boolean().nullish(),
  minCardSlots: z.number().int().min(1).max(2).nullish(),
  viewfinder: z.enum(["evf", "hybrid", "none"]).nullish(),
  screen: z.enum(["fixed", "tilt", "vari-angle", "none"]).nullish(),
  touchScreen: z.boolean().nullish(),
  maxWeightGrams: z.number().positive().nullish().describe("Shooting weight with battery and card."),
  minMegapixels: z.number().positive().nullish(),
  releasedFrom: z.number().int().nullish().describe("First year on sale, inclusive."),
  discontinued: z.boolean().nullish().describe("true: only bodies Fujifilm no longer sells; false: only current ones."),
});

export type BodyQuery = z.infer<typeof bodyQuerySchema>;
type SetQuery = { [K in keyof BodyQuery]?: NonNullable<BodyQuery[K]> };

function normalizeName(text: string): string {
  return text.toLowerCase().replace(/^fujifilm/, "").replace(/[^a-z0-9]+/g, "");
}

export function findBodiesByName(names: string[]): { found: Body[]; notFound: string[] } {
  const found: Body[] = [];
  const notFound: string[] = [];
  for (const name of names) {
    const key = normalizeName(name);
    const match = key
      ? bodies.find((body) => [body.name, ...(body.aliases ?? [])].some((label) => normalizeName(label) === key))
      : undefined;
    if (!match) {
      notFound.push(name);
    } else if (!found.includes(match)) {
      found.push(match);
    }
  }
  return { found, notFound };
}

// true: matches, false: does not, undefined: the catalog has no figure for it.
type Verdict = boolean | undefined;

function checks(body: Body, q: SetQuery): Verdict[] {
  const out: Verdict[] = [];
  if (q.ibis !== undefined) {out.push(body.ibis === q.ibis);}
  if (q.minIbisStops !== undefined) {out.push(body.ibis ? body.ibisStops === undefined ? undefined : body.ibisStops >= q.minIbisStops : false);}
  if (q.subjectDetectionAF !== undefined) {out.push(body.subjectDetectionAF === q.subjectDetectionAF);}
  if (q.weatherSealed !== undefined) {out.push(body.weatherSealed === undefined ? undefined : body.weatherSealed === q.weatherSealed);}
  if (q.builtInFlash !== undefined) {out.push(body.builtInFlash === undefined ? undefined : body.builtInFlash === q.builtInFlash);}
  if (q.minCardSlots !== undefined) {out.push(body.cardSlots === undefined ? undefined : body.cardSlots >= q.minCardSlots);}
  if (q.viewfinder !== undefined) {out.push(body.viewfinder.type === q.viewfinder);}
  if (q.screen !== undefined) {out.push(body.screen === undefined ? undefined : body.screen.type === q.screen);}
  if (q.touchScreen !== undefined) {
    out.push(body.screen?.touch === undefined ? undefined : body.screen.touch === q.touchScreen);
  }
  if (q.maxWeightGrams !== undefined) {out.push(body.weightGrams === undefined ? undefined : body.weightGrams <= q.maxWeightGrams);}
  if (q.minMegapixels !== undefined) {out.push(body.megapixels >= q.minMegapixels);}
  if (q.releasedFrom !== undefined) {out.push(body.releaseYear >= q.releasedFrom);}
  if (q.discontinued !== undefined) {out.push(body.discontinued === q.discontinued);}
  return out;
}

export interface BodyRecord {
  name: string;
  series: Body["series"];
  mount: Mount;
  releaseYear: number;
  discontinued: boolean;
  megapixels: number;
  sensor: Body["sensor"];
  processor?: string;
  ibis: boolean;
  ibisStops?: number;
  subjectDetectionAF: boolean;
  maxVideo?: string;
  viewfinder: Body["viewfinder"];
  screen?: Body["screen"];
  cardSlots?: number;
  burstFps?: Body["burstFps"];
  builtInFlash?: boolean;
  weatherSealed?: boolean;
  weightGrams?: number;
  dimensionsMm: Body["dimensionsMm"];
  /** Optional fields the catalog has no figure for; say so instead of guessing. */
  notInData: string[];
}

const OPTIONAL_FIELDS = [
  "processor",
  "ibisStops",
  "maxVideo",
  "screen",
  "cardSlots",
  "burstFps",
  "builtInFlash",
  "weatherSealed",
  "weightGrams",
] as const;

export function toBodyRecord(body: Body): BodyRecord {
  const record: Partial<Body> = { ...body };
  delete record.id;
  delete record.aliases;
  delete record.sources;
  return {
    ...(record as Omit<Body, "id" | "aliases" | "sources">),
    name: `Fujifilm ${body.name}`,
    notInData: OPTIONAL_FIELDS.filter((field) => body[field] === undefined && !(field === "ibisStops" && !body.ibis)),
  };
}

export function queryBodies(
  input: BodyQuery,
  currentMount: Mount,
): { matches: BodyRecord[]; maybe: BodyRecord[]; totalMatched: number; notFound?: string[] } {
  // Strict-mode callers fill every field and send null for the ones they leave unset.
  const query = Object.fromEntries(Object.entries(input).filter(([, value]) => value != null)) as SetQuery;
  if (query.names?.length) {
    const { found, notFound } = findBodiesByName(query.names);
    return {
      matches: found.map(toBodyRecord),
      maybe: [],
      totalMatched: found.length,
      ...(notFound.length > 0 ? { notFound } : {}),
    };
  }
  const mount = query.mount ?? currentMount;
  const matches: Body[] = [];
  const maybe: Body[] = [];
  for (const body of [...bodies].sort((a, b) => b.releaseYear - a.releaseYear)) {
    if (mount !== "any" && body.mount !== mount) {continue;}
    const verdicts = checks(body, query);
    if (verdicts.includes(false)) {continue;}
    (verdicts.includes(undefined) ? maybe : matches).push(body);
  }
  return {
    matches: matches.slice(0, BODY_RESULT_LIMIT).map(toBodyRecord),
    maybe: maybe.slice(0, BODY_RESULT_LIMIT).map(toBodyRecord),
    totalMatched: matches.length,
  };
}
