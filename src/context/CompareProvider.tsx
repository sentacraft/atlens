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
  state: CompareState;
  setState: React.Dispatch<React.SetStateAction<CompareState>>;
}

const CompareContext = createContext<CompareContextValue | null>(null);

export function CompareProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState(initialCompareState);
  const value = useMemo(() => ({ state, setState }), [state]);
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
  const mount = useEffectiveMount();
  const { state, setState } = ctx;
  const compareIds = state[mount];

  const prevIdsRef = useRef(compareIds);
  useEffect(() => {
    const prev = prevIdsRef.current;
    prevIdsRef.current = compareIds;
    const added = compareIds.filter((id) => !prev.includes(id));
    if (added.length === 1) {
      track("compare_add", { lens_slug: added[0] });
    }
  }, [compareIds]);

  const add = useCallback(
    (id: string) => {
      setState(prev => {
        const slot = prev[mount];
        if (slot.includes(id) || slot.length >= MAX_COMPARE) {
          return prev;
        }
        return { ...prev, [mount]: [...slot, id] };
      });
    },
    [mount, setState],
  );

  const remove = useCallback(
    (id: string) => {
      setState(prev => {
        const slot = prev[mount];
        if (!slot.includes(id)) {
          return prev;
        }
        return { ...prev, [mount]: slot.filter((v) => v !== id) };
      });
    },
    [mount, setState],
  );

  const reorder = useCallback(
    (fromIndex: number, toIndex: number) => {
      setState(prev => {
        const slot = prev[mount];
        if (
          fromIndex < 0 || fromIndex >= slot.length ||
          toIndex < 0 || toIndex >= slot.length ||
          fromIndex === toIndex
        ) {
          return prev;
        }
        const ids = [...slot];
        [ids[fromIndex], ids[toIndex]] = [ids[toIndex], ids[fromIndex]];
        return { ...prev, [mount]: ids };
      });
    },
    [mount, setState],
  );

  const clear = useCallback(
    () => {
      setState(prev => {
        if (prev[mount].length === 0) {
          return prev;
        }
        return { ...prev, [mount]: [] };
      });
    },
    [mount, setState],
  );

  const toggle = useCallback(
    (id: string) => {
      setState(prev => {
        const slot = prev[mount];
        if (slot.includes(id)) {
          return { ...prev, [mount]: slot.filter((v) => v !== id) };
        }
        if (slot.length >= MAX_COMPARE) {
          return prev;
        }
        return { ...prev, [mount]: [...slot, id] };
      });
    },
    [mount, setState],
  );

  const seed = useCallback(
    (ids: string[]) => {
      setState(prev => {
        const next = Array.from(new Set(ids)).slice(0, MAX_COMPARE);
        const slot = prev[mount];
        if (next.length === slot.length && next.every((id, i) => id === slot[i])) {
          return prev;
        }
        return { ...prev, [mount]: next };
      });
    },
    [mount, setState],
  );

  return { compareIds, add, remove, reorder, clear, toggle, seed };
}
