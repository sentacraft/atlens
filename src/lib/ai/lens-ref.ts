import type { Lens, Mount } from "@/lib/types";

// The only lens identifier the model sees. Catalogue ids are patterned, and the model
// rebuilt them instead of copying (`viltrox-af-27mm-f1.4-x` for `viltrox-af-27mm-f14-x`).

// FNV-1a plus murmur3's fmix32 finalizer: FNV alone has weak low bits on structured input.
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

// A test asserts the live catalogue has no collisions.
export const LENS_REF_LENGTH = 5;
const SPACE = 36 ** LENS_REF_LENGTH;

export function lensRef(id: string): string {
  return (hash32(id) % SPACE).toString(36).padStart(LENS_REF_LENGTH, "0");
}

export const LENS_LINK_PREFIX = "lens:";

export function parseLensLink(href: string | undefined): string | null {
  return href?.startsWith(LENS_LINK_PREFIX) ? href.slice(LENS_LINK_PREFIX.length) : null;
}

// GFM splits table cells on `|` before parsing links, and Sigma names contain one.
// https://github.github.com/gfm/#tables-extension-
const LENS_LINK_LABEL = /\[([^[\]\n]*)\]\(lens:/g;
const LABEL_PUNCTUATION = /\\[!-/:-@[-`{-~]|[!-/:-@[-`{-~]/g;

export function escapeLensLinkLabels(markdown: string): string {
  return markdown.replace(LENS_LINK_LABEL, (_, label: string) => {
    const escaped = label.replace(LABEL_PUNCTUATION, (char) => (char.length === 2 ? char : `\\${char}`));
    return `[${escaped}](${LENS_LINK_PREFIX}`;
  });
}

export function buildRefIndex(lenses: Lens[]): Map<string, Lens> {
  return new Map(lenses.map((lens) => [lensRef(lens.id), lens]));
}

// Kept out of lens-link-index, which imports the catalogue: a client import of this type
// must never be one edit away from bundling it.
export type LensLinkIndex = Record<string, { id: string; mount: Mount }>;
