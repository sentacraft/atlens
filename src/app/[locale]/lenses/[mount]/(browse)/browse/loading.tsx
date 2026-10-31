import { LENS_INDEX_SHELL_CLS, SECTION_TOP_CLS, SKELETON_CLS } from "@/config/ui-tokens";
import { cn } from "@/lib/utils";

const bar = (className: string) => <div className={cn("rounded", SKELETON_CLS, className)} />;

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white flex flex-col overflow-hidden max-xs:flex-row">
      <div className={cn("relative aspect-[3/2] sm:aspect-[5/4] max-xs:aspect-auto max-xs:w-[132px] max-xs:shrink-0 border-b border-zinc-100 max-xs:border-b-0 max-xs:border-r", SKELETON_CLS)} />

      <div className="flex flex-1 flex-col gap-2 p-3 sm:gap-2.5 sm:p-4">
        <div className="flex flex-col gap-1.5">
          {bar("h-2.5 w-16")}
          {bar("h-4 w-3/4")}
          {bar("h-4 w-1/2")}
        </div>
        <div className="flex gap-1 mt-1">
          {bar("h-5 w-8 rounded-md")}
          {bar("h-5 w-8 rounded-md")}
        </div>
        <div className="mt-auto hidden sm:grid sm:grid-cols-2 sm:gap-x-3 gap-y-1.5">
          {bar("h-3 w-12")}
          {bar("h-3 w-10 ml-auto")}
          {bar("h-3 w-16")}
          {bar("h-3 w-10 ml-auto")}
        </div>
        <div className="mt-auto flex items-baseline justify-between gap-2 sm:hidden">
          {bar("h-3 w-20")}
          {bar("h-3 w-8")}
        </div>
      </div>

      <div className="px-3 pb-3 sm:px-4 sm:pb-4 max-xs:hidden">{bar("h-9 w-full rounded-lg")}</div>
    </div>
  );
}

export default function LensesLoading() {
  return (
    <div className={cn(LENS_INDEX_SHELL_CLS, SECTION_TOP_CLS, "flex flex-col gap-6 pb-[max(6rem,calc(var(--compare-bar-height,0px)+2rem))]")} aria-busy="true">
      <div className="flex gap-6 border-b border-zinc-200 pb-3">
        {bar("h-5 w-24")}
        {bar("h-5 w-40")}
      </div>

      <div className="hidden flex-col gap-3 sm:flex">
        <div className="flex items-start gap-3">
          <div className="flex flex-1 flex-wrap gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={cn("h-9 rounded-full", SKELETON_CLS, i === 0 ? "w-12" : "w-24")} />
            ))}
          </div>
          {bar("h-10 w-28 shrink-0 rounded-xl")}
        </div>
        {bar("h-9 w-56 rounded-xl")}
        {bar("h-9 w-56 rounded-xl")}
      </div>

      <div className="flex flex-col gap-3 sm:hidden">
        <div className="flex justify-between gap-3">
          {bar("h-9 w-36 rounded-full")}
          {bar("h-10 w-28 rounded-xl")}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {bar("h-10 rounded-xl")}
          {bar("h-10 rounded-xl")}
        </div>
      </div>

      <div className="flex items-center justify-between">
        {bar("h-4 w-24")}
        {bar("h-9 w-44 rounded-full")}
      </div>

      <div className="grid grid-cols-1 gap-4 xs:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}
