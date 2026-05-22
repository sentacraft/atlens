"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
import {
  compareReducer,
  initialCompareState,
  type CompareState,
} from "@/lib/compareReducer";
import { MAX_COMPARE } from "@/lib/lens";
import { useEffectiveMount } from "@/hooks/useMountParam";
import { track } from "@/lib/analytics";
import type { Mount } from "@/lib/types";

interface CompareContextValue {
  state: CompareState;
  addToCompare: (id: string, mount: Mount) => void;
  removeFromCompare: (id: string, mount: Mount) => void;
  toggleCompare: (id: string, mount: Mount) => void;
  reorderCompare: (ids: string[], mount: Mount) => void;
  clearCompare: (mount: Mount) => void;
  seedCompare: (ids: string[], mount: Mount) => void;
}

const CompareContext = createContext<CompareContextValue | null>(null);

export function CompareProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(compareReducer, initialCompareState);

  // Mutators are invoked from onClick / event handlers, which rules out
  // useEffectEvent (that hook is restricted to Effects). The classic
  // ref-sync pattern is the supported way to read latest state inside a
  // stable event-handler callback.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const addToCompare = useCallback((id: string, mount: Mount) => {
    const slot = stateRef.current[mount];
    if (slot.includes(id) || slot.length >= MAX_COMPARE) return;
    dispatch({ type: "add", id, mount });
    track("compare_add", { lens_slug: id });
  }, []);

  const removeFromCompare = useCallback((id: string, mount: Mount) => {
    dispatch({ type: "remove", id, mount });
  }, []);

  const toggleCompare = useCallback((id: string, mount: Mount) => {
    const slot = stateRef.current[mount];
    if (slot.includes(id)) {
      dispatch({ type: "remove", id, mount });
    } else if (slot.length < MAX_COMPARE) {
      dispatch({ type: "add", id, mount });
      track("compare_add", { lens_slug: id });
    }
  }, []);

  const reorderCompare = useCallback((ids: string[], mount: Mount) => {
    dispatch({ type: "reorder", ids, mount });
  }, []);

  const clearCompare = useCallback((mount: Mount) => {
    dispatch({ type: "clear", mount });
  }, []);

  const seedCompare = useCallback((ids: string[], mount: Mount) => {
    dispatch({ type: "seed", ids, mount });
  }, []);

  // All mutators are useCallback-stable (deps=[]). Only `state` drives
  // identity changes of the value object.
  const value = useMemo<CompareContextValue>(
    () => ({
      state,
      addToCompare,
      removeFromCompare,
      toggleCompare,
      reorderCompare,
      clearCompare,
      seedCompare,
    }),
    [
      state,
      addToCompare,
      removeFromCompare,
      toggleCompare,
      reorderCompare,
      clearCompare,
      seedCompare,
    ],
  );

  return <CompareContext value={value}>{children}</CompareContext>;
}

/**
 * Mount-scoped compare hook. No unscoped variant — every compare surface
 * lives under `/[locale]/lenses/[mount]/...`, so the URL always supplies
 * the mount and cross-mount writes are not a real scenario.
 *
 * Returned mutators auto-bind to the current mount; reference-stable per
 * mount, so consumers that put them in useEffect deps don't re-run on
 * state changes.
 */
export function useCompare() {
  const ctx = useContext(CompareContext);
  if (!ctx) {
    throw new Error("useCompare must be used within CompareProvider");
  }
  const mount = useEffectiveMount();
  const compareIds = ctx.state[mount];

  // Destructure first so deps reference the stable inner mutators, not the
  // ctx object whose identity changes on every state mutation.
  const {
    addToCompare: ctxAdd,
    removeFromCompare: ctxRemove,
    toggleCompare: ctxToggle,
    reorderCompare: ctxReorder,
    clearCompare: ctxClear,
    seedCompare: ctxSeed,
  } = ctx;

  const addToCompare = useCallback(
    (id: string) => ctxAdd(id, mount),
    [ctxAdd, mount],
  );
  const removeFromCompare = useCallback(
    (id: string) => ctxRemove(id, mount),
    [ctxRemove, mount],
  );
  const toggleCompare = useCallback(
    (id: string) => ctxToggle(id, mount),
    [ctxToggle, mount],
  );
  const reorderCompare = useCallback(
    (ids: string[]) => ctxReorder(ids, mount),
    [ctxReorder, mount],
  );
  const clearCompare = useCallback(() => ctxClear(mount), [ctxClear, mount]);
  const seedCompare = useCallback(
    (ids: string[]) => ctxSeed(ids, mount),
    [ctxSeed, mount],
  );

  // canToggle is derived state, recomputed each render — used in render
  // output only, not in any effect dep.
  const canToggle = (id: string) =>
    compareIds.includes(id) || compareIds.length < MAX_COMPARE;

  return {
    compareIds,
    addToCompare,
    removeFromCompare,
    toggleCompare,
    reorderCompare,
    clearCompare,
    seedCompare,
    canToggle,
  };
}
