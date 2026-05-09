"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { MAX_COMPARE } from "@/lib/lens";
import { useEffectiveMount } from "@/hooks/useMountParam";
import type { Mount } from "@/lib/types";

type CompareState = { X: string[]; G: string[] };

interface CompareContextValue {
  compareState: CompareState;
  toggleCompare: (id: string, mount: Mount) => void;
  replaceCompare: (ids: string[], mount: Mount) => void;
  clearCompare: (mount: Mount) => void;
  canToggle: (id: string, mount: Mount) => boolean;
}

const CompareContext = createContext<CompareContextValue | null>(null);

export function CompareProvider({ children }: { children: React.ReactNode }) {
  const [compareState, setCompareState] = useState<CompareState>({ X: [], G: [] });

  const toggleCompare = useCallback((id: string, mount: Mount) => {
    setCompareState((prev) => {
      const slot = prev[mount];
      const next = slot.includes(id)
        ? slot.filter((x) => x !== id)
        : slot.length < MAX_COMPARE
          ? [...slot, id]
          : slot;
      return { ...prev, [mount]: next };
    });
  }, []);

  const replaceCompare = useCallback((ids: string[], mount: Mount) => {
    const nextIds = Array.from(new Set(ids)).slice(0, MAX_COMPARE);
    setCompareState((prev) => {
      const slot = prev[mount];
      if (slot.length === nextIds.length && slot.every((id, i) => id === nextIds[i])) {
        return prev;
      }
      return { ...prev, [mount]: nextIds };
    });
  }, []);

  const clearCompare = useCallback((mount: Mount) => {
    setCompareState((prev) => ({ ...prev, [mount]: [] }));
  }, []);

  // canToggle reads compareState directly; using a state ref keeps the function
  // reference stable across state changes so that consumers (and any useEffect
  // that depends on it) don't re-run on every mutation.
  const canToggle = useCallback(
    (id: string, mount: Mount) => {
      const slot = compareState[mount];
      return slot.includes(id) || slot.length < MAX_COMPARE;
    },
    [compareState]
  );

  const value = useMemo(
    () => ({
      compareState,
      toggleCompare,
      replaceCompare,
      clearCompare,
      canToggle,
    }),
    [canToggle, clearCompare, compareState, replaceCompare, toggleCompare]
  );

  return <CompareContext value={value}>{children}</CompareContext>;
}

export function useCompare() {
  const ctx = useContext(CompareContext);
  if (!ctx) {
    throw new Error("useCompare must be used within CompareProvider");
  }
  return ctx;
}

// Mount-scoped hook for components inside /lenses/[mount]/...
// Automatically reads the current mount from URL params.
//
// The returned function references are stable across state changes — they
// only depend on the underlying provider callbacks (which are themselves
// useCallback-stable) and the current mount. This stability matters because
// any useEffect with these in its dep array would otherwise re-run after
// every Context state change, which can clobber state seeded by the effect
// itself (e.g. seeding compareState from an `initialLensIds` prop).
export function useMountedCompare() {
  const ctx = useCompare();
  const mount = useEffectiveMount();
  const { compareState, toggleCompare, replaceCompare, clearCompare, canToggle } = ctx;

  const compareIds = compareState[mount];

  const toggleCompareScoped = useCallback(
    (id: string) => toggleCompare(id, mount),
    [toggleCompare, mount]
  );
  const replaceCompareScoped = useCallback(
    (ids: string[]) => replaceCompare(ids, mount),
    [replaceCompare, mount]
  );
  const clearCompareScoped = useCallback(
    () => clearCompare(mount),
    [clearCompare, mount]
  );
  const canToggleScoped = useCallback(
    (id: string) => canToggle(id, mount),
    [canToggle, mount]
  );

  return useMemo(
    () => ({
      compareIds,
      toggleCompare: toggleCompareScoped,
      replaceCompare: replaceCompareScoped,
      clearCompare: clearCompareScoped,
      canToggle: canToggleScoped,
    }),
    [compareIds, toggleCompareScoped, replaceCompareScoped, clearCompareScoped, canToggleScoped]
  );
}
