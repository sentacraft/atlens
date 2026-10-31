import { PAGE_GUTTER_CLS, SKELETON_CLS } from "@/config/ui-tokens";
import { cn } from "@/lib/utils";

const bar = (className: string) => <div className={cn("rounded", SKELETON_CLS, className)} />;

export default function LensDetailLoading() {
  return (
    <div className={cn("w-full max-w-4xl mx-auto py-6 flex flex-col gap-6", PAGE_GUTTER_CLS)} aria-busy="true">
      <div className="flex items-center justify-between">
        {bar("h-4 w-48")}
        <div className="flex gap-4">
          {bar("h-4 w-12")}
          {bar("h-4 w-24")}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-6 sm:gap-8">
        <div className="w-full max-w-64 mx-auto sm:mx-0 shrink-0 sm:w-64">
          <div className={cn("aspect-square rounded-2xl", SKELETON_CLS)} />
        </div>

        <div className="flex-1 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            {bar("h-3 w-20")}
            {bar("h-8 w-3/4 rounded-lg")}
          </div>
          {bar("h-6 w-28")}
          <div className="grid grid-cols-2 gap-2">
            {bar("h-10 rounded-lg")}
            {bar("h-10 rounded-lg")}
            {bar("h-10 rounded-lg")}
            {bar("h-10 rounded-lg")}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 overflow-hidden">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className={i > 0 ? "border-t border-zinc-100" : ""}>
            <div className="px-4 py-2 bg-zinc-100/80">{bar("h-3 w-20 bg-zinc-200")}</div>
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} className="flex border-b border-zinc-100 last:border-0">
                <div className="w-40 shrink-0 px-4 py-2.5 bg-zinc-50/60">{bar("h-3 w-20")}</div>
                <div className="flex-1 px-4 py-2.5">{bar("h-3 w-24")}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
