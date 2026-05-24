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
import { track } from "@/lib/analytics";

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

  const add = useCallback(
    (id: string) => {
      if (compareIds.includes(id) || compareIds.length >= MAX_COMPARE) {
        return;
      }
      
      setState(prev => ({ ...prev, [mount]: [...prev[mount], id] }));
      track("compare_add", { lens_slug: id });
    },
    [mount, compareIds, setState],
  );

  const remove = useCallback(
    (id: string) => {
      if (!compareIds.includes(id)) {
        return;
      }
      setState(prev => ({ ...prev, [mount]: prev[mount].filter((v) => v !== id) }));
    },
    [mount, compareIds, setState],
  );

  const reorder = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (
        fromIndex < 0 || fromIndex >= compareIds.length ||
        toIndex < 0 || toIndex >= compareIds.length ||
        fromIndex === toIndex
      ) {
        return;
      }

      const ids = [...compareIds];
      [ids[fromIndex], ids[toIndex]] = [ids[toIndex], ids[fromIndex]];

      setState(prev => ({ ...prev, [mount]: ids }));
    },
    [mount, compareIds, setState],
  );

  const clear = useCallback(
    () => {
      if (compareIds.length === 0) {
        return;
      }
      setState(prev => ({ ...prev, [mount]: [] }));
    },
    [mount, compareIds, setState]
  );

  const toggle = useCallback(
    (id: string) => {
      if (compareIds.includes(id)) {
        remove(id); 
      } else if (compareIds.length < MAX_COMPARE) {
        add(id);
      }
    },
    [compareIds, add, remove],
  );

  const seed = useCallback(
    (ids: string[]) => {
      const next = Array.from(new Set(ids)).slice(0, MAX_COMPARE);
      if (next.length === compareIds.length && next.every((id, i) => id === compareIds[i])) {
        return;
      }
      setState(prev => ({ ...prev, [mount]: next }));
    },
    [mount, compareIds, setState]
  );

  return { compareIds, add, remove, reorder, clear, toggle, seed };
}
