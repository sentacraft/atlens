// UI constants — z-index layers and layout breakpoints.
// Animation params that belong to a specific component live in that
// component's config (e.g. Iris animation params are in IrisConfig in brand.ts).

// ── Z-index layers ────────────────────────────────────────────────────────────
//
// Stacking order (low → high):
//   local    z-10   Small, local layering inside a single component.
//                   Examples: a close button inside a card, sticky data cells
//                   inside a table, or an item that only needs to beat its
//                   immediate siblings.
//   table    z-20   Table-only structural layering inside an isolated table
//                   stacking context.
//                   Examples: sticky compare headers or section chrome that
//                   must sit above table cells but not above app-level UI.
//   shell    z-30   App shell framing UI that sits above page content.
//                   Examples: the global nav bar or other persistent page-frame
//                   elements that should stay above normal content.
//   fixed    z-40   Fixed-position utility UI that floats above content and
//                   app shell, but is still below overlays and modals.
//                   Examples: compare bars, floating action buttons, mobile
//                   utility affordances.
//   overlay  z-50   Non-modal overlays that temporarily sit on top of the app.
//                   Examples: drawers, dropdown menus, popovers, and similar
//                   overlay primitives.
//   dialog   z-[60] Modal surfaces and their backdrops.
//                   Use when the UI should block interaction with the rest of
//                   the app and sit above overlays such as drawers/selects.
//
// Note: table-level z-indexes (local, table) often live in a CSS stacking
// context isolated from the rest of the page; their values only need to be
// consistent relative to each other, not to fixed/overlay/dialog layers.
//
// Naming guidance:
// - Prefer structural fixes first: correct portal container, stacking context,
//   and DOM placement before increasing z-index.
// - Reach for these tokens only when two elements are legitimately in the same
//   stacking contest and one category should consistently sit above another.

export const Z = {
  local:   "z-10",
  table:   "z-20",
  shell:   "z-30",
  fixed:   "z-40",
  overlay: "z-50",
  dialog:  "z-[60]",
} as const;

// ── Layout ────────────────────────────────────────────────────────────────────
//
// The layout's scroll container (ScrollContainerContext) owns the vertical
// scroll; the nav bar sits above it in a flex column. Individual pages should
// use h-full / flex-1 rather than calc(100dvh - navHeight).

// ── Lens list / compare ───────────────────────────────────────────────────────

// TODO: max number of lenses that can be compared simultaneously
// TODO: default sort field and direction
