export const PAGE_GUTTER_CLS = "px-5 sm:px-8 lg:px-12";

export const LENS_INDEX_SHELL_CLS = `mx-auto w-full max-w-7xl ${PAGE_GUTTER_CLS}`;

// 72px is three of the widest gap (xl:gap-6): the min track never exceeds a quarter row, capping the grid at 4 columns.
export const LENS_GRID_CLS =
  "grid grid-cols-1 gap-4 xs:grid-cols-[repeat(auto-fill,minmax(max(208px,calc((100%_-_72px)/4)),1fr))] md:gap-5 xl:gap-6";

export const ACTION_PRIMARY_CLS =
  "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors";

export const ACTION_OUTLINE_CLS =
  "inline-flex h-10 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800";

export const ACTION_ESCAPE_CLS =
  "group inline-flex h-12 items-center gap-2.5 border border-zinc-900 bg-white pl-5 pr-4 text-sm font-medium text-zinc-900 " +
  "transition-colors duration-150 hover:bg-zinc-900 hover:text-white active:bg-zinc-800 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 " +
  "dark:border-zinc-100 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-100 dark:hover:text-zinc-900 dark:active:bg-zinc-200";

export const CARD_SELECTED_BORDER_CLS =
  "border-zinc-900 ring-1 ring-zinc-900 shadow-lg shadow-zinc-900/10 dark:border-zinc-100 dark:ring-zinc-100 dark:shadow-zinc-100/10";

export const LIST_ITEM_ACTIVE_CLS =
  "border-zinc-200 bg-zinc-50/80 dark:border-zinc-700 dark:bg-zinc-800/50";

export const ACTIVE_DOT_CLS = "bg-zinc-900 dark:bg-zinc-100";

export const SEARCH_TRIGGER_CLS =
  "inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-300 hover:text-zinc-950 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:border-zinc-700 dark:hover:text-zinc-50";

export const PILL_CLS =
  "inline-flex h-9 items-center rounded-full border border-transparent bg-zinc-50 px-3.5 text-[12px] font-medium text-zinc-700 shadow-sm shadow-zinc-950/[0.02] transition-all duration-200 hover:border-zinc-200 hover:bg-zinc-100 hover:text-zinc-900 dark:border-transparent dark:bg-zinc-800/50 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-700 dark:hover:text-zinc-100";
export const PILL_ALL_ACTIVE_CLS =
  "inline-flex h-9 items-center rounded-full border border-transparent bg-zinc-200 px-3.5 text-[12px] font-semibold text-zinc-900 shadow-sm shadow-zinc-950/[0.02] transition-all duration-200 hover:border-zinc-200 hover:bg-zinc-200 dark:border-transparent dark:bg-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-500";
export const PILL_ACTIVE_CLS =
  "inline-flex h-9 items-center rounded-full border border-transparent bg-zinc-900 px-3.5 text-[12px] font-medium text-white shadow-sm transition-all duration-200 hover:border-zinc-800 hover:bg-zinc-800 dark:border-transparent dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200";

export const CHIP_BASE_CLS =
  "flex-shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium cursor-pointer transition-all duration-150 select-none";
export const CHIP_IDLE_CLS =
  "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-900 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-100 dark:hover:text-zinc-100";
export const CHIP_ACTIVE_CLS =
  "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900";

export const ICON_NAV_BTN_CLS =
  "inline-flex shrink-0 items-center justify-center rounded-lg transition-colors " +
  "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 active:bg-zinc-100 active:text-zinc-900 " +
  "dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 dark:active:bg-zinc-800 dark:active:text-zinc-100";

export const FEEDBACK_LINK_CLS =
  "text-zinc-500 underline underline-offset-2 transition-colors " +
  "hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100";

export const TEXT_LINK_CLS =
  "text-zinc-700 underline decoration-zinc-300 underline-offset-4 transition-colors " +
  "hover:text-zinc-900 hover:decoration-zinc-500 " +
  "dark:text-zinc-300 dark:decoration-zinc-600 dark:hover:text-zinc-100 dark:hover:decoration-zinc-400";

// Over busy content, compose with FROSTED_OVERLAY_CHROME_CLS.
export const ICON_CLOSE_BTN_CLS =
  "inline-flex shrink-0 items-center justify-center rounded-full transition-colors " +
  "text-zinc-500 hover:bg-red-50 hover:text-red-500 active:bg-red-50 active:text-red-500 " +
  "dark:text-zinc-400 dark:hover:bg-red-950/30 dark:hover:text-red-400 dark:active:bg-red-950/30 dark:active:text-red-400";

export const FROSTED_OVERLAY_CHROME_CLS =
  "border border-zinc-200/80 bg-white/95 shadow-sm backdrop-blur-sm " +
  "dark:border-zinc-700/80 dark:bg-zinc-900/95";

export const PRICE_DISCLAIMER_WARN_CLS =
  "font-semibold text-zinc-500 dark:text-zinc-400";
export const PRICE_DISCLAIMER_BODY_CLS =
  "text-zinc-500 dark:text-zinc-400";
export const PRICE_DISCLAIMER_ICON_CLS =
  "shrink-0 text-zinc-400 dark:text-zinc-500";

export const UTILITY_BTN_CLS =
  "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs " +
  "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 " +
  "dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 transition-colors";

export const AI_TAG_CLS =
  "rounded px-1 text-[10px] leading-[14px] font-semibold tracking-wide bg-zinc-900/[0.08] text-zinc-900 dark:bg-zinc-50/10 dark:text-zinc-50";

export const NAV_CAPSULE_CLS =
  "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-zinc-200 bg-white pr-1 pl-2.5 transition-colors sm:gap-2 sm:pl-3 " +
  "hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800";

export const POPUP_SURFACE_CLS =
  "rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900";

export const POPUP_SCROLL_CLS =
  "overflow-x-hidden overflow-y-auto [scrollbar-width:thin] [scrollbar-color:rgb(212_212_216)_transparent] dark:[scrollbar-color:rgb(63_63_70)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-300/70 dark:[&::-webkit-scrollbar-thumb]:bg-zinc-700/70";

// overflow-hidden is required: it clips the edge rows' hover to the rounded corners. Rows must
// carry no popup-level vertical padding, or the hover never reaches the edge.
export const MENU_POPUP_CLS =
  POPUP_SURFACE_CLS + " " +
  "overflow-hidden origin-(--transform-origin) duration-100 " +
  "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 " +
  "data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95";

export const MENU_ITEM_CLS =
  "flex cursor-default items-center gap-2.5 px-4 py-2.5 text-sm text-zinc-600 outline-none transition-colors hover:bg-zinc-50 hover:text-zinc-900 data-[highlighted]:bg-zinc-50 data-[highlighted]:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50 dark:data-[highlighted]:bg-zinc-800 dark:data-[highlighted]:text-zinc-50";
export const MENU_ITEM_DANGER_CLS =
  "flex cursor-default items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 outline-none transition-colors hover:bg-red-50 data-[highlighted]:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30 dark:data-[highlighted]:bg-red-950/30";
