// TODO: Audit src/lib/lens/lens.ts and filter components for hardcoded brand
// names, mount names, focal-length buckets, max-aperture buckets, etc.
// Example shape:
// export const BRANDS = ["Fujinon", "Viltrox", "TTArtisan", ...] as const;
// export type Brand = typeof BRANDS[number];

// TODO: The 1.5× APS-C crop factor used for equivalent focal-length calculation
// is likely hardcoded in src/lib/lens/lens.ts. Move it here.
// export const XMOUNT_CROP_FACTOR = 1.5;

// TODO: supported locales list (currently lives in next-intl config / routing).
// Centralising here lets non-Next.js code (e.g. pipeline scripts) reference it.
