// Z-index layers inside the page, low to high: local z-10, table z-20, shell z-30 (nav), fixed z-40
// (compare bar, FABs). Portaled popups (dialogs, drawers, menus, popovers, selects) take no z-index:
// the page root is `isolate`, so they paint above it and stack in the order they open.

export const Z = {
  local:   "z-10",
  table:   "z-20",
  shell:   "z-30",
  fixed:   "z-40",
} as const;

export const FAB_REVEAL_SCROLL_Y = 400;

/** The widest the page content gets: Tailwind's max-w-7xl, which the nav and page shells use. */
export const PAGE_MAX_WIDTH = "80rem";

/** Iris's side panel, in px; the page narrows by this much while it is open. */
export const IRIS_PANEL_WIDTH = 400;

