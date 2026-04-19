/**
 * Design token class strings for interactive UI states.
 * Single source of truth — prevents design language drift across components.
 *
 * Design language:
 *   Primary action  → black (zinc-900 light / zinc-100 dark)
 *   Outline action  → border, no fill (share, external links, supplementary)
 *   Selected state  → zinc-900 border + ring (light) / zinc-100 (dark)
 */

/** Primary action button (compare, add-to-compare, hero CTA). */
export const ACTION_PRIMARY_CLS =
  "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors";

/** Outline / secondary action button (share, external links, supplementary actions). */
export const ACTION_OUTLINE_CLS =
  "inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800";

/** Selected card border + ring (e.g. lens card added to compare). */
export const CARD_SELECTED_BORDER_CLS =
  "border-zinc-900 ring-1 ring-zinc-900 shadow-lg shadow-zinc-900/10 dark:border-zinc-100 dark:ring-zinc-100 dark:shadow-zinc-100/10";

/** Active/hovered item in a list or search result (e.g. LensSearchDialog). */
export const LIST_ITEM_ACTIVE_CLS =
  "border-zinc-200 bg-zinc-50/80 dark:border-zinc-700 dark:bg-zinc-800/50";

/** Small indicator dot signalling an active hidden filter. */
export const ACTIVE_DOT_CLS = "bg-zinc-900 dark:bg-zinc-100";

/**
 * Square icon button for navigation actions (e.g. back).
 * Transparent background by default; hover shows a subtle fill.
 * Add a size class (e.g. `h-8 w-8`) per usage site.
 */
export const ICON_NAV_BTN_CLS =
  "inline-flex shrink-0 items-center justify-center rounded-lg transition-colors " +
  "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 active:bg-zinc-100 active:text-zinc-900 " +
  "dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 dark:active:bg-zinc-800 dark:active:text-zinc-100";

/**
 * Circular dismiss / close icon button.
 * Normal state is transparent; hover/active shows a red fill + icon.
 * Add a size class (e.g. `h-8 w-8`) per usage site.
 *
 * Overlay variant (for buttons that float over colored surfaces, e.g. share
 * poster dialog): compose with `bg-white/90 shadow-sm backdrop-blur-sm
 * dark:bg-zinc-800/90` to give it a persistent frosted-glass base.
 */
export const ICON_CLOSE_BTN_CLS =
  "inline-flex shrink-0 items-center justify-center rounded-full transition-colors " +
  "text-zinc-500 hover:bg-red-50 hover:text-red-500 active:bg-red-50 active:text-red-500 " +
  "dark:text-zinc-400 dark:hover:bg-red-950/30 dark:hover:text-red-400 dark:active:bg-red-950/30 dark:active:text-red-400";
