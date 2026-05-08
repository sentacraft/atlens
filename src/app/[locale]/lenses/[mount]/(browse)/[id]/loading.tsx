export default function LensDetailLoading() {
  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-8">
      {/* Back button placeholder */}
      <div className="h-8 w-20 rounded-lg bg-zinc-100 dark:bg-zinc-800 animate-pulse" />

      <div className="flex flex-col sm:flex-row gap-8">
        {/* Image */}
        <div className="w-full max-w-56 mx-auto sm:mx-0 shrink-0 sm:w-56">
          <div className="aspect-square rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
        </div>

        {/* Info */}
        <div className="flex-1 flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <div className="h-4 w-24 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
            <div className="h-8 w-3/4 rounded-lg bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <div className="h-9 w-32 rounded-lg bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
            <div className="h-9 w-28 rounded-lg bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
          </div>

          {/* Spec table */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={i > 0 ? "border-t border-zinc-100 dark:border-zinc-800" : ""}>
                {/* Group header */}
                <div className="px-4 py-2 bg-zinc-100/80 dark:bg-zinc-800/60">
                  <div className="h-3 w-20 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
                </div>
                {/* Rows */}
                {Array.from({ length: 4 }).map((_, j) => (
                  <div
                    key={j}
                    className="flex border-b border-zinc-100 dark:border-zinc-800 last:border-0"
                  >
                    <div className="w-40 shrink-0 px-4 py-2.5 bg-zinc-50/60 dark:bg-zinc-900/30">
                      <div className="h-3 w-20 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
                    </div>
                    <div className="flex-1 px-4 py-2.5">
                      <div className="h-3 w-24 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
