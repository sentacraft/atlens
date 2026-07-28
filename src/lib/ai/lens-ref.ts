import type { Lens } from "@/lib/types";

// A short opaque handle for one lens, derived from its id — the only lens identifier
// the model ever sees or passes back.
//
// The catalogue id (`fujifilm-xf-56mmf12-r-x`) stays the system's identity: it is the
// URL path, the key hand-authored editorial refers to, and what logs and analytics read.
// But it is *patterned*, and a model shown a patterned string reconstructs it from the
// rule instead of copying it — observed repeatedly as `viltrox-af-27mm-f1.4-x` for
// `viltrox-af-27mm-f14-x`, a lens link that then resolves to nothing. Five opaque
// characters have no rule to reconstruct, so the only way to produce one is to copy it,
// and a mistyped one lands in the 60 million unused values rather than on another lens.
//
// This is a boundary encoding, not an identity: it is derived at the model boundary and
// never persisted, so nothing outside that boundary has to know it exists.

// FNV-1a over 32 bits, then murmur3's fmix32 finalizer. FNV alone has a documented
// weakness in its low bits — only the top bit of its bottom byte depends on every input
// byte — which bites exactly on structured input, and lens ids are structured (brand,
// series, focal, aperture). The finalizer spreads every input bit across the whole word,
// so two ids differing by one suffix land nowhere near each other. 32-bit arithmetic
// throughout (Math.imul), so this needs no BigInt and runs the same everywhere.
function hash32(value: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    h = Math.imul(h ^ value.charCodeAt(i), 0x01000193);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

// Five base36 characters: 60 million values for a catalogue in the hundreds, which keeps
// the chance of any collision at all near a hundredth of a percent. A test asserts the
// live catalogue has none, so a future pipeline addition that collides fails CI.
export const LENS_REF_LENGTH = 5;
const SPACE = 36 ** LENS_REF_LENGTH;

export function lensRef(id: string): string {
  return (hash32(id) % SPACE).toString(36).padStart(LENS_REF_LENGTH, "0");
}

// The wire form of a lens reference in Iris's prose: [name](lens:<ref>). The prefix and
// the parse live together so neither the renderer nor the eval has to know how long it is.
export const LENS_LINK_PREFIX = "lens:";

export function parseLensLink(href: string | undefined): string | null {
  return href?.startsWith(LENS_LINK_PREFIX) ? href.slice(LENS_LINK_PREFIX.length) : null;
}

// ref -> lens, for turning what the model wrote back into a real lens.
export function buildRefIndex(lenses: Lens[]): Map<string, Lens> {
  return new Map(lenses.map((lens) => [lensRef(lens.id), lens]));
}
