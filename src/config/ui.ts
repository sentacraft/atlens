// Z-index layers, low to high: local z-10, table z-20, shell z-30 (nav), fixed z-40 (compare bar,
// FABs), overlay z-50 (drawers, menus), dialog z-[60]. Fix the portal or stacking context before
// reaching for a higher layer.

export const Z = {
  local:   "z-10",
  table:   "z-20",
  shell:   "z-30",
  fixed:   "z-40",
  overlay: "z-50",
  dialog:  "z-[60]",
} as const;

export const FAB_REVEAL_SCROLL_Y = 400;

