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

  const value = useMemo(
    () => ({
      compareState,
      toggleCompare,
      replaceCompare,
      clearCompare,
      canToggle: (id: string, mount: Mount) =>
        compareState[mount].includes(id) || compareState[mount].length < MAX_COMPARE,
    }),
    [clearCompare, compareState, replaceCompare, toggleCompare]
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
export function useMountedCompare() {
  const ctx = useCompare();
  const mount = useEffectiveMount();
  return {
    compareIds: ctx.compareState[mount],
    toggleCompare: (id: string) => ctx.toggleCompare(id, mount),
    replaceCompare: (ids: string[]) => ctx.replaceCompare(ids, mount),
    clearCompare: () => ctx.clearCompare(mount),
    canToggle: (id: string) => ctx.canToggle(id, mount),
  };
}
