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
  "inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800";

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
 * Underlined text link / inline action (clear filters, toggle, text-only CTA).
 * Pair with per-site font-size, tracking, and whitespace classes.
 */
export const TEXT_LINK_CLS =
  "text-zinc-700 underline decoration-zinc-300 underline-offset-4 transition-colors " +
  "hover:text-zinc-900 hover:decoration-zinc-500 " +
  "dark:text-zinc-300 dark:decoration-zinc-600 dark:hover:text-zinc-100 dark:hover:decoration-zinc-400";

/**
 * Circular dismiss / close icon button.
 * Normal state is transparent; hover/active shows a red fill + icon.
 * Add a size class (e.g. `h-8 w-8`) per usage site.
 *
 * For overlay-style placement (floating over images, scrollers, or other
 * busy content) compose with FROSTED_OVERLAY_CHROME_CLS for the visible
 * boundary / frosted-glass background.
 */
export const ICON_CLOSE_BTN_CLS =
  "inline-flex shrink-0 items-center justify-center rounded-full transition-colors " +
  "text-zinc-500 hover:bg-red-50 hover:text-red-500 active:bg-red-50 active:text-red-500 " +
  "dark:text-zinc-400 dark:hover:bg-red-950/30 dark:hover:text-red-400 dark:active:bg-red-950/30 dark:active:text-red-400";

/**
 * Frosted-glass chrome for icon buttons that float over arbitrary
 * surfaces (modal close X, carousel scroll chevrons, etc). Provides the
 * visible boundary + translucent background + soft shadow so the button
 * reads as a tappable surface even on busy underlying content.
 *
 * Compose alongside a base button class (e.g. ICON_CLOSE_BTN_CLS or the
 * scroll-chevron's own base) plus a size class.
 */
export const FROSTED_OVERLAY_CHROME_CLS =
  "border border-zinc-200/80 bg-white/95 shadow-sm backdrop-blur-sm " +
  "dark:border-zinc-700/80 dark:bg-zinc-900/95";

/**
 * Price disclaimer tokens — used by PriceDisclaimer (detail page, compare
 * table popover) and the SharePoster price caption.
 *
 * Visual hierarchy:
 *   warn → amber, bold (warning prefix, e.g. "仅供参考" / "Indicative price")
 *   body → zinc, normal weight (the actual disclaimer sentence)
 *
 * The leading TriangleAlert icon shares the warn color.
 */
export const PRICE_DISCLAIMER_WARN_CLS =
  "font-semibold text-zinc-500 dark:text-zinc-400";
export const PRICE_DISCLAIMER_BODY_CLS =
  "text-zinc-500 dark:text-zinc-400";
export const PRICE_DISCLAIMER_ICON_CLS =
  "shrink-0 text-zinc-400 dark:text-zinc-500";
