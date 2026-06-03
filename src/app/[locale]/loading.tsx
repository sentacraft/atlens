export default function HomeLoading() {
  return (
    <div className="relative h-[calc(100svh-var(--nav-height)-var(--safe-inset-bottom))] overflow-clip grid place-items-center">
      <section className="flex flex-col items-center text-center px-4">
        {/* Hero iris */}
        <div className="h-[102px] w-[102px] rounded-full bg-zinc-100 dark:bg-zinc-800 animate-pulse" />

        {/* Brand title */}
        <div className="mt-8 h-12 sm:h-14 w-52 rounded-lg bg-zinc-100 dark:bg-zinc-800 animate-pulse" />

        {/* Tagline */}
        <div className="mt-4 h-5 w-64 max-w-full rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />

        {/* CTA buttons */}
        <div className="mt-8 flex flex-col items-center gap-3">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <div className="h-10 w-32 rounded-lg bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
            <div className="h-10 w-32 rounded-lg bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
          </div>
          {/* Data info line */}
          <div className="h-3 w-40 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
        </div>
      </section>

      {/* Bottom tagline */}
      <div className="absolute inset-x-0 bottom-6 flex justify-center">
        <div className="h-3 w-44 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
      </div>
    </div>
  );
}
