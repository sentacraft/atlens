"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * False on the server and during hydration, true afterwards. Gate any render on
 * client-only state behind it — e.g. the Better Auth session, which lives in a
 * module-level store that streaming hydration can find already resolved.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
