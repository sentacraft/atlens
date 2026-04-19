"use client";

// Offline fallback page served by the service worker when a navigation request
// fails due to no network. Intentionally outside the [locale] routing tree so
// the service worker can pre-cache and serve it at /offline without redirects.
// Hardcoded English — not connected to next-intl.

export default function OfflinePage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 px-6 text-center">
      {/* Aperture ring placeholder */}
      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-zinc-200 dark:border-zinc-800">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="h-6 w-6 text-zinc-400"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M18.364 5.636a9 9 0 1 1-12.728 0M12 3v9"
          />
        </svg>
      </div>

      <div className="flex flex-col gap-2">
        <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          You&rsquo;re offline
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-xs">
          No network connection. Check your connection and try again.
        </p>
      </div>

      <button
        onClick={() => window.location.reload()}
        className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors underline underline-offset-4"
      >
        Try again
      </button>
    </div>
  );
}
