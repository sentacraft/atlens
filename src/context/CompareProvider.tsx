"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
} from "react";
import {
  compareReducer,
  initialCompareState,
  type CompareAction,
  type CompareState,
  type ScopedCompareAction,
} from "@/lib/compareReducer";
import { MAX_COMPARE } from "@/lib/lens";
import { useEffectiveMount } from "@/hooks/useMountParam";
import { track } from "@/lib/analytics";

interface CompareContextValue {
  state: CompareState;
  dispatch: (action: CompareAction) => void;
}

const CompareContext = createContext<CompareContextValue | null>(null);

export function CompareProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(compareReducer, initialCompareState);
  // dispatch from useReducer is reference-stable by contract; only state
  // identity drives value changes here.
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <CompareContext value={value}>{children}</CompareContext>;
}

/**
 * Mount-scoped compare hook — the only public API.
 *
 * Returns the current mount's id list plus a mount-injecting `dispatch`,
 * and three high-level helpers (`add`, `remove`, `toggle`) that bundle the
 * "read state → dispatch + analytics" pattern so consumers don't repeat it.
 *
 * Helpers live here, not in the Provider, so the per-render closure can
 * read latest state directly — no ref-sync gymnastics, and the Provider
 * stays a pure state machine.
 *
 * Use `dispatch` directly for the lower-frequency actions (`reorder`,
 * `clear`, `seed`) — they have no analytics gate and no state-dependent
 * branching, so a dedicated helper would just be a typed alias.
 */
export function useCompare() {
  const ctx = useContext(CompareContext);
  if (!ctx) {
    throw new Error("useCompare must be used within CompareProvider");
  }
  const mount = useEffectiveMount();
  const { state, dispatch: rawDispatch } = ctx;
  const compareIds = state[mount];

  // Stable per mount: useReducer's dispatch is reference-stable, mount only
  // changes on URL navigation. Safe to put in useEffect deps without
  // triggering re-runs on state mutations.
  const dispatch = useCallback(
    (action: ScopedCompareAction) =>
      rawDispatch({ ...action, mount } as CompareAction),
    [rawDispatch, mount],
  );

  // Helpers carry `compareIds` in their deps so they re-read latest state
  // each render. Identity changes on every mutation — fine for event-handler
  // usage (onClick), don't put these in useEffect deps.
  const add = useCallback(
    (id: string) => {
      if (compareIds.includes(id) || compareIds.length >= MAX_COMPARE) return;
      dispatch({ type: "add", id });
      track("compare_add", { lens_slug: id });
    },
    [compareIds, dispatch],
  );

  const remove = useCallback(
    (id: string) => dispatch({ type: "remove", id }),
    [dispatch],
  );

  const toggle = useCallback(
    (id: string) => {
      if (compareIds.includes(id)) {
        dispatch({ type: "remove", id });
      } else if (compareIds.length < MAX_COMPARE) {
        dispatch({ type: "add", id });
        track("compare_add", { lens_slug: id });
      }
    },
    [compareIds, dispatch],
  );

  return { compareIds, dispatch, add, remove, toggle };
}
