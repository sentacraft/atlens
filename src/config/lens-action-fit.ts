/**
 * How the lens page's action row (Compare, Check price, Ask Iris) gives way as its `@container`
 * narrows, keeping the three on one line. The widths come from the English labels and serve every
 * locale. In order of what goes first: Iris's long label, Iris's short label, the store hint after
 * "Check price", then padding and "Check price" itself.
 */
export const LENS_ACTION_FIT = {
  irisFull: "hidden @min-[564px]:inline",
  irisShort: "hidden @min-[464px]:inline @min-[564px]:hidden",
  irisPadding: "px-2.5 @min-[344px]:px-3 @min-[464px]:px-4",
  storeHint: "hidden @min-[408px]:inline",
  roomy: "px-2.5 @min-[344px]:px-4",
  priceLabel: "hidden @min-[344px]:inline",
  priceLabelShort: "@min-[344px]:hidden",
} as const;
