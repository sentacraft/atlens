function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col overflow-hidden max-[499px]:flex-row">
      {/* Image area */}
      <div className="relative aspect-[3/2] sm:aspect-[5/4] bg-zinc-100 dark:bg-zinc-800 animate-pulse max-[499px]:aspect-auto max-[499px]:w-[132px] max-[499px]:shrink-0 border-b border-zinc-100 dark:border-zinc-800 max-[499px]:border-b-0 max-[499px]:border-r" />

      {/* Body */}
      <div className="flex flex-1 flex-col gap-2 p-3 sm:gap-2.5 sm:p-4">
        <div className="flex flex-col gap-1.5">
          <div className="h-2.5 w-16 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
          <div className="h-4 w-3/4 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
          <div className="h-4 w-1/2 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
        </div>
        <div className="flex gap-1 mt-1">
          <div className="h-5 w-8 rounded-md bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
          <div className="h-5 w-8 rounded-md bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
        </div>
        <div className="mt-auto hidden sm:grid sm:grid-cols-2 sm:gap-x-3 gap-y-1.5">
          <div className="h-3 w-12 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
          <div className="h-3 w-10 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse ml-auto" />
          <div className="h-3 w-16 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
          <div className="h-3 w-10 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse ml-auto" />
        </div>
        <dl className="mt-auto flex items-baseline justify-between gap-2 sm:hidden">
          <div className="h-3 w-20 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
          <div className="h-3 w-8 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
        </dl>
      </div>

      {/* Footer button */}
      <div className="px-3 pb-3 sm:px-4 sm:pb-4 max-[499px]:hidden">
        <div className="h-9 w-full rounded-lg bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
      </div>
    </div>
  );
}

export default function LensesLoading() {
  return (
    <div className="w-full max-w-7xl mx-auto px-5 sm:px-6 py-8 flex flex-col gap-6 pb-24">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="h-8 w-32 rounded-lg bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
        </div>
        {/* Filter bar placeholder */}
        <div className="h-9 w-full rounded-lg bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
        <div className="flex justify-between">
          <div className="h-4 w-24 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
          <div className="h-8 w-40 rounded-full bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-4 min-[500px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}
