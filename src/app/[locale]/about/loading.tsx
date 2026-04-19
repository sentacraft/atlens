export default function AboutLoading() {
  return (
    <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 pt-4 sm:pt-12 pb-12 flex flex-col gap-6">
      {/* Logo + title */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-full bg-zinc-100 dark:bg-zinc-800 animate-pulse shrink-0" />
        <div className="h-8 w-48 rounded-lg bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
      </div>

      {/* Content sections */}
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex flex-col gap-3">
          <div className="h-4 w-24 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
          <div className="h-3 w-full rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
          <div className="h-3 w-5/6 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
          <div className="h-3 w-4/6 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
        </div>
      ))}
    </div>
  );
}
