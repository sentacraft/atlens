import { PAGE_GUTTER_CLS, SKELETON_CLS } from "@/config/ui-tokens";
import { cn } from "@/lib/utils";

/**
 * A loading placeholder that fits most pages: a title, a two-line intro and a content block. Used
 * where one loading.tsx covers pages of different shapes, so it never promises a layout the page
 * then breaks.
 */
export default function PageSkeleton() {
  return (
    <div className={cn("mx-auto flex w-full max-w-5xl flex-col gap-3 pt-8 pb-16", PAGE_GUTTER_CLS)} aria-busy="true">
      <div className={cn("h-8 w-2/3 max-w-md rounded-lg", SKELETON_CLS)} />
      <div className={cn("mt-2 h-4 w-full max-w-2xl rounded", SKELETON_CLS)} />
      <div className={cn("h-4 w-4/5 max-w-xl rounded", SKELETON_CLS)} />
      <div className={cn("mt-6 h-[50vh] rounded-2xl", SKELETON_CLS)} />
    </div>
  );
}
