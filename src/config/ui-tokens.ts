export const PAGE_GUTTER_CLS = "px-5 sm:px-8 lg:px-12";

/** Room between the nav and a section's tab row (SectionTabs), the same in every section. */
export const SECTION_TOP_CLS = "pt-6 sm:pt-8";

export const LENS_INDEX_SHELL_CLS = `mx-auto w-full max-w-7xl ${PAGE_GUTTER_CLS}`;

/** A page under the browse layout: the bottom padding clears the compare bar when it shows. */
export const BROWSE_PAGE_MAIN_CLS = `mx-auto max-w-6xl py-8 pb-[max(10rem,calc(var(--compare-bar-height,0px)+8rem))] ${PAGE_GUTTER_CLS}`;

// 72px is three of the widest gap (xl:gap-6): the min track never exceeds a quarter row, capping the grid at 4 columns.
export const LENS_GRID_CLS =
  "grid grid-cols-1 gap-4 xs:grid-cols-[repeat(auto-fill,minmax(max(208px,calc((100%_-_72px)/4)),1fr))] md:gap-5 xl:gap-6";

export const ACTION_PRIMARY_CLS =
  "bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors";

/** The quiet button beside a main action: Cancel, Skip, Not now. */
export const ACTION_QUIET_CLS =
  "h-9 rounded-lg px-3 text-sm text-zinc-600 transition-colors hover:bg-zinc-100";

export const ACTION_OUTLINE_CLS =
  "inline-flex h-10 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50";

/**
 * An equal-width button in a row of a lens panel's actions (lens page, chart sheet): 44px tall on
 * phones. Inside a container under 300px wide (a 320px screen) it drops its icon to fit "Mark as owned".
 */
export const PANEL_ACTION_CLS = `${ACTION_OUTLINE_CLS} min-w-0 justify-center whitespace-nowrap max-sm:h-11 @max-[300px]:px-2 @max-[300px]:[&>svg]:hidden`;

export const ACTION_ESCAPE_CLS =
  "group inline-flex h-12 items-center gap-2.5 border border-zinc-900 bg-white pl-5 pr-4 text-sm font-medium text-zinc-900 " +
  "transition-colors duration-150 hover:bg-zinc-900 hover:text-white active:bg-zinc-800 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900";

/** A segmented control: the track, and each tab in it (Base UI Tabs mark the current one data-active). */
export const SEGMENTED_LIST_CLS = "flex gap-1 rounded-lg bg-zinc-100 p-1";
export const SEGMENTED_TAB_CLS =
  "flex-1 rounded-md px-3 py-1.5 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900 " +
  "data-[active]:bg-white data-[active]:text-zinc-900 data-[active]:shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 cursor-pointer";

export const PAGE_SECTION_CLS = "border-t border-zinc-200 pt-6";

export const SECTION_HEADING_CLS = "text-base font-semibold text-zinc-900";

/** A long page's own section heading, such as a brand page's chapters or a weight tier. */
export const PAGE_SECTION_HEADING_CLS = "font-heading text-xl font-bold text-zinc-900 md:text-2xl";

export const COMPARE_CHIP_CLS =
  "inline-flex h-8 items-center gap-1 rounded-full border text-xs font-medium transition-colors";

export const COMPARE_CHIP_STATE_CLS = {
  selected: `${ACTION_PRIMARY_CLS} border-transparent`,
  full: "border-zinc-200 bg-white text-zinc-400",
  idle: "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50",
} as const;

export const CARD_SELECTED_BORDER_CLS =
  "border-zinc-900 ring-1 ring-zinc-900 shadow-lg shadow-zinc-900/10";

export const LIST_ITEM_ACTIVE_CLS =
  "border-zinc-200 bg-zinc-50/80";

export const ACTIVE_DOT_CLS = "bg-zinc-900";

export const SEARCH_TRIGGER_CLS =
  "inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-300 hover:text-zinc-950";

export const PILL_CLS =
  "inline-flex h-9 items-center rounded-full border border-transparent bg-zinc-50 px-3.5 text-[12px] font-medium text-zinc-700 shadow-sm shadow-zinc-950/[0.02] transition-all duration-200 hover:border-zinc-200 hover:bg-zinc-100 hover:text-zinc-900";
export const PILL_ALL_ACTIVE_CLS =
  "inline-flex h-9 items-center rounded-full border border-transparent bg-zinc-200 px-3.5 text-[12px] font-semibold text-zinc-900 shadow-sm shadow-zinc-950/[0.02] transition-all duration-200 hover:border-zinc-200 hover:bg-zinc-200";
export const PILL_ACTIVE_CLS =
  "inline-flex h-9 items-center rounded-full border border-transparent bg-zinc-900 px-3.5 text-[12px] font-medium text-white shadow-sm transition-all duration-200 hover:border-zinc-800 hover:bg-zinc-800";

export const CHIP_BASE_CLS =
  "flex-shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium cursor-pointer transition-all duration-150 select-none";
export const CHIP_IDLE_CLS =
  "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-900 hover:text-zinc-900";
export const CHIP_ACTIVE_CLS =
  "border-zinc-900 bg-zinc-900 text-white";

export const ICON_NAV_BTN_CLS =
  "inline-flex shrink-0 items-center justify-center rounded-lg transition-colors " +
  "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 active:bg-zinc-100 active:text-zinc-900";

export const FEEDBACK_LINK_CLS =
  "text-zinc-500 underline underline-offset-2 transition-colors " +
  "hover:text-zinc-900";

/** A page section that a contents link or hash can jump to, clear of the sticky nav. */
export const ANCHORED_SECTION_CLS = "flex scroll-mt-[calc(var(--nav-height)+1rem)] flex-col gap-4";
export const SECTION_HEADING_ROW_CLS = "flex items-center justify-between gap-3 border-b border-zinc-200 pb-2";

export const SECTION_VIEW_ALL_LINK_CLS =
  "shrink-0 whitespace-nowrap text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-900";

export const TEXT_LINK_CLS =
  "text-zinc-700 underline decoration-zinc-300 underline-offset-4 transition-colors " +
  "hover:text-zinc-900 hover:decoration-zinc-500";

// Over busy content, compose with FROSTED_OVERLAY_CHROME_CLS.
export const ICON_CLOSE_BTN_CLS =
  "inline-flex shrink-0 items-center justify-center rounded-full transition-colors " +
  "text-zinc-500 hover:bg-red-50 hover:text-red-500 active:bg-red-50 active:text-red-500";

// A card action that mouse users see on hover or focus inside the `group` card; touch has no hover,
// so it stays visible there.
export const HOVER_REVEAL_CLS =
  "pointer-fine:xs:opacity-0 pointer-fine:xs:group-hover:opacity-100 pointer-fine:xs:group-focus-within:opacity-100";

export const FROSTED_OVERLAY_CHROME_CLS =
  "border border-zinc-200/80 bg-white/95 shadow-sm backdrop-blur-sm";

export const PRICE_DISCLAIMER_WARN_CLS =
  "font-semibold text-zinc-500";
export const PRICE_DISCLAIMER_BODY_CLS =
  "text-zinc-500";
export const PRICE_DISCLAIMER_ICON_CLS =
  "shrink-0 text-zinc-400";

export const UTILITY_BTN_CLS =
  "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs " +
  "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 " +
  "transition-colors";

export const AI_TAG_CLS =
  "rounded px-1 text-[10px] leading-[14px] font-semibold tracking-wide bg-zinc-900/[0.08] text-zinc-900";

// Iris's reply text, and anything the chat writes in her voice.
export const IRIS_PROSE_CLS = "prose prose-sm max-w-none prose-p:my-2 prose-headings:mb-1 prose-hr:hidden";

// Review findings: strengths and weaknesses are told apart by icon shape as well as colour.
export const REVIEW_POSITIVE_CLS = "text-emerald-600";
export const REVIEW_NEGATIVE_CLS = "text-amber-600";

// Surface of a card Iris shows in the chat for the user to act on: gear, sign-in.
export const CHAT_CARD_CLS = "w-full max-w-[560px] overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm";

export const NAV_CAPSULE_CLS =
  "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-zinc-200 bg-white pr-1 pl-2.5 transition-colors sm:gap-2 sm:pl-3 " +
  "hover:bg-zinc-50";

export const POPUP_SURFACE_CLS =
  "rounded-lg border border-zinc-200 bg-white shadow-lg";

export const POPUP_SCROLL_CLS =
  "overflow-x-hidden overflow-y-auto [scrollbar-width:thin] [scrollbar-color:rgb(212_212_216)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-300/70";

// overflow-hidden is required: it clips the edge rows' hover to the rounded corners. Rows must
// carry no popup-level vertical padding, or the hover never reaches the edge.
export const MENU_POPUP_CLS =
  POPUP_SURFACE_CLS + " " +
  "overflow-hidden origin-(--transform-origin) duration-100 " +
  "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 " +
  "data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95";

export const MENU_ITEM_CLS =
  "flex items-center gap-2.5 px-4 py-2.5 text-sm text-zinc-600 outline-none transition-colors hover:bg-zinc-50 hover:text-zinc-900 data-[highlighted]:bg-zinc-50 data-[highlighted]:text-zinc-900";
export const MENU_ITEM_DANGER_CLS =
  "flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 outline-none transition-colors hover:bg-red-50 data-[highlighted]:bg-red-50";
