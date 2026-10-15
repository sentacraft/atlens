import { bodies } from "@/lib/body/data";
import { buildLensSearchIndex, searchLensIndex, type SearchableLens } from "@/lib/lens/search";
import type { GearRequestInput } from "@/lib/ai/gear-request";

export interface GearHints {
  /** Catalog ids that one named model matched exactly once; the gear card preselects them. */
  bodies: string[];
  lenses: string[];
  /** Names that matched nothing or more than one model; the user picks these themselves. */
  unresolved: string[];
}

function compact(value: string): string {
  return value.toLowerCase().replace(/^fuji(film)?\s*/, "").replace(/[^a-z0-9]/g, "");
}

function matchBody(name: string): string | undefined {
  const key = compact(name);
  const matches = bodies.filter((body) => [body.name, ...(body.aliases ?? [])].some((alias) => compact(alias) === key));
  return matches.length === 1 ? matches[0].id : undefined;
}

/** Maps the models a user named in chat to catalog ids, keeping only unambiguous matches. */
export function resolveGearHints<T extends SearchableLens & { id: string }>(
  input: GearRequestInput,
  lenses: T[],
): GearHints {
  const hints: GearHints = { bodies: [], lenses: [], unresolved: [] };
  for (const name of input.bodies ?? []) {
    const id = matchBody(name);
    if (id) {
      hints.bodies.push(id);
    } else {
      hints.unresolved.push(name);
    }
  }
  const index = buildLensSearchIndex(lenses);
  for (const name of input.lenses ?? []) {
    const matches = searchLensIndex(index, name, 2);
    if (matches.length === 1) {
      hints.lenses.push(matches[0].id);
    } else {
      hints.unresolved.push(name);
    }
  }
  return {
    bodies: [...new Set(hints.bodies)],
    lenses: [...new Set(hints.lenses)],
    unresolved: hints.unresolved,
  };
}
