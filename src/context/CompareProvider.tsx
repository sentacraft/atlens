"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { MAX_COMPARE } from "@/lib/lens/lens";
import { useEffectiveMount } from "@/hooks/useMountParam";
import { track } from "@/lib/analytics/analytics";

type CompareState = { X: string[]; G: string[] };
const initialCompareState: CompareState = { X: [], G: [] };

interface CompareContextValue {
  compareIds: string[];
  add: (id: string) => void;
  remove: (id: string) => void;
  reorder: (fromIndex: number, toIndex: number) => void;
  clear: () => void;
  toggle: (id: string) => void;
  seed: (ids: string[]) => void;
}

const CompareContext = createContext<CompareContextValue | null>(null);

export function CompareProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState(initialCompareState);
  const mount = useEffectiveMount();
  const compareIds = state[mount];
  const prevIdsRef = useRef(compareIds);

  const add = useCallback(
    (id: string) => {
      setState((prev) => {
        const slot = prev[mount];
        if (slot.includes(id) || slot.length >= MAX_COMPARE) {
          return prev;
        }
        return { ...prev, [mount]: [...slot, id] };
      });
    },
    [mount],
  );

  const remove = useCallback(
    (id: string) => {
      setState((prev) => {
        const slot = prev[mount];
        if (!slot.includes(id)) {
          return prev;
        }
        return { ...prev, [mount]: slot.filter((value) => value !== id) };
      });
    },
    [mount],
  );

  const reorder = useCallback(
    (fromIndex: number, toIndex: number) => {
      setState((prev) => {
        const slot = prev[mount];
        if (
          fromIndex < 0 ||
          fromIndex >= slot.length ||
          toIndex < 0 ||
          toIndex >= slot.length ||
          fromIndex === toIndex
        ) {
          return prev;
        }
        const ids = [...slot];
        [ids[fromIndex], ids[toIndex]] = [ids[toIndex], ids[fromIndex]];
        return { ...prev, [mount]: ids };
      });
    },
    [mount],
  );

  const clear = useCallback(() => {
    setState((prev) => {
      if (prev[mount].length === 0) {
        return prev;
      }
      return { ...prev, [mount]: [] };
    });
  }, [mount]);

  const toggle = useCallback(
    (id: string) => {
      setState((prev) => {
        const slot = prev[mount];
        if (slot.includes(id)) {
          return { ...prev, [mount]: slot.filter((value) => value !== id) };
        }
        if (slot.length >= MAX_COMPARE) {
          return prev;
        }
        return { ...prev, [mount]: [...slot, id] };
      });
    },
    [mount],
  );

  const seed = useCallback(
    (ids: string[]) => {
      setState((prev) => {
        const next = Array.from(new Set(ids)).slice(0, MAX_COMPARE);
        const slot = prev[mount];
        if (
          next.length === slot.length &&
          next.every((id, index) => id === slot[index])
        ) {
          return prev;
        }
        return { ...prev, [mount]: next };
      });
    },
    [mount],
  );

  const value = useMemo(
    () => ({ compareIds, add, remove, reorder, clear, toggle, seed }),
    [compareIds, add, remove, reorder, clear, toggle, seed],
  );

  useEffect(() => {
    const prev = prevIdsRef.current;
    prevIdsRef.current = compareIds;
    const added = compareIds.filter((id) => !prev.includes(id));
    if (added.length === 1) {
      track("compare_add", { lens_slug: added[0] });
    }
  }, [compareIds]);

  return (
    <CompareContext value={value}>
      {children}
    </CompareContext>
  );
}

export function useCompare() {
  const ctx = useContext(CompareContext);
  if (!ctx) {
    throw new Error("useCompare must be used within CompareProvider");
  }
  return ctx;
}
