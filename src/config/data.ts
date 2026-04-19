// Static business data — enumerations and lookup tables that are not generated
// by the pipeline and do not belong in lenses.json.
//
// Rule: if a value is hardcoded in a component or lib file purely because it's
// a known constant (not derived from lens data), move it here.

// ── TODO: Filter / sort enumerations ─────────────────────────────────────────
// TODO: Audit src/lib/lens.ts and filter components for hardcoded brand names,
// mount names, focal-length buckets, max-aperture buckets, etc.
// Example shape:
// export const BRANDS = ["Fujinon", "Viltrox", "TTArtisan", ...] as const;
// export type Brand = typeof BRANDS[number];

// ── TODO: Fujifilm X-mount crop factor ───────────────────────────────────────
// TODO: The 1.5× APS-C crop factor used for equivalent focal-length calculation
// is likely hardcoded in src/lib/lens.ts. Move it here.
// export const XMOUNT_CROP_FACTOR = 1.5;

// ── TODO: Locale / i18n metadata ─────────────────────────────────────────────
// TODO: supported locales list (currently lives in next-intl config / routing).
// Centralising here lets non-Next.js code (e.g. pipeline scripts) reference it.
