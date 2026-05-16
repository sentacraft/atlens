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
import { MAX_COMPARE } from "@/lib/lens";
import { useEffectiveMount } from "@/hooks/useMountParam";
import { track } from "@/lib/analytics";
import type { Mount } from "@/lib/types";

type CompareState = { X: string[]; G: string[] };

interface CompareContextValue {
  compareState: CompareState;
  // User-initiated add. Fires `compare_add` exactly once per successful add.
  // No-ops (and emits no event) when the id is already in the slot or the
  // slot is at MAX_COMPARE.
  addToCompare: (id: string, mount: Mount) => void;
  // User-initiated remove. No-op when the id isn't in the slot.
  removeFromCompare: (id: string, mount: Mount) => void;
  // Convenience wrapper. Routes to addToCompare or removeFromCompare based
  // on current membership, so the call site doesn't need to know.
  toggleCompare: (id: string, mount: Mount) => void;
  // User-initiated reorder (no membership change). Emits no event.
  reorderCompare: (ids: string[], mount: Mount) => void;
  clearCompare: (mount: Mount) => void;
  // Non-user state transition: URL hydration (shared compare links) and
  // undo-restore both use this. Distinguished from addToCompare so that
  // analytics counts user clicks only, not state arriving from outside.
  seedCompare: (ids: string[], mount: Mount) => void;
  canToggle: (id: string, mount: Mount) => boolean;
}

const CompareContext = createContext<CompareContextValue | null>(null);

export function CompareProvider({ children }: { children: React.ReactNode }) {
  const [compareState, setCompareState] = useState<CompareState>({ X: [], G: [] });
  // Mirror state into a ref so `toggleCompare` can read the latest value
  // without re-creating the callback on every state change. User event
  // handlers always run after effects flush, so the ref is up-to-date by
  // the time toggleCompare reads it.
  const stateRef = useRef(compareState);
  useEffect(() => {
    stateRef.current = compareState;
  }, [compareState]);

  const addToCompare = useCallback((id: string, mount: Mount) => {
    let didAdd = false;
    setCompareState((prev) => {
      const slot = prev[mount];
      if (slot.includes(id) || slot.length >= MAX_COMPARE) {
        return prev;
      }
      didAdd = true;
      return { ...prev, [mount]: [...slot, id] };
    });
    if (didAdd) {
      track("compare_add", { lens_slug: id });
    }
  }, []);

  const removeFromCompare = useCallback((id: string, mount: Mount) => {
    setCompareState((prev) => {
      const slot = prev[mount];
      if (!slot.includes(id)) {
        return prev;
      }
      return { ...prev, [mount]: slot.filter((x) => x !== id) };
    });
  }, []);

  const toggleCompare = useCallback(
    (id: string, mount: Mount) => {
      if (stateRef.current[mount].includes(id)) {
        removeFromCompare(id, mount);
      } else {
        addToCompare(id, mount);
      }
    },
    [addToCompare, removeFromCompare],
  );

  const reorderCompare = useCallback((ids: string[], mount: Mount) => {
    setCompareState((prev) => {
      const slot = prev[mount];
      if (slot.length === ids.length && slot.every((id, i) => id === ids[i])) {
        return prev;
      }
      return { ...prev, [mount]: ids };
    });
  }, []);

  const clearCompare = useCallback((mount: Mount) => {
    setCompareState((prev) => ({ ...prev, [mount]: [] }));
  }, []);

  const seedCompare = useCallback((ids: string[], mount: Mount) => {
    const nextIds = Array.from(new Set(ids)).slice(0, MAX_COMPARE);
    setCompareState((prev) => {
      const slot = prev[mount];
      if (slot.length === nextIds.length && slot.every((id, i) => id === nextIds[i])) {
        return prev;
      }
      return { ...prev, [mount]: nextIds };
    });
  }, []);

  // canToggle reads compareState directly; using a state ref keeps the function
  // reference stable across state changes so that consumers (and any useEffect
  // that depends on it) don't re-run on every mutation.
  const canToggle = useCallback(
    (id: string, mount: Mount) => {
      const slot = compareState[mount];
      return slot.includes(id) || slot.length < MAX_COMPARE;
    },
    [compareState],
  );

  const value = useMemo(
    () => ({
      compareState,
      addToCompare,
      removeFromCompare,
      toggleCompare,
      reorderCompare,
      clearCompare,
      seedCompare,
      canToggle,
    }),
    [
      compareState,
      addToCompare,
      removeFromCompare,
      toggleCompare,
      reorderCompare,
      clearCompare,
      seedCompare,
      canToggle,
    ],
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
  const {
    compareState,
    addToCompare,
    removeFromCompare,
    toggleCompare,
    reorderCompare,
    clearCompare,
    seedCompare,
    canToggle,
  } = ctx;

  const compareIds = compareState[mount];

  const addScoped = useCallback((id: string) => addToCompare(id, mount), [addToCompare, mount]);
  const removeScoped = useCallback(
    (id: string) => removeFromCompare(id, mount),
    [removeFromCompare, mount],
  );
  const toggleScoped = useCallback((id: string) => toggleCompare(id, mount), [toggleCompare, mount]);
  const reorderScoped = useCallback(
    (ids: string[]) => reorderCompare(ids, mount),
    [reorderCompare, mount],
  );
  const clearScoped = useCallback(() => clearCompare(mount), [clearCompare, mount]);
  const seedScoped = useCallback((ids: string[]) => seedCompare(ids, mount), [seedCompare, mount]);
  const canToggleScoped = useCallback((id: string) => canToggle(id, mount), [canToggle, mount]);

  return useMemo(
    () => ({
      compareIds,
      addToCompare: addScoped,
      removeFromCompare: removeScoped,
      toggleCompare: toggleScoped,
      reorderCompare: reorderScoped,
      clearCompare: clearScoped,
      seedCompare: seedScoped,
      canToggle: canToggleScoped,
    }),
    [
      compareIds,
      addScoped,
      removeScoped,
      toggleScoped,
      reorderScoped,
      clearScoped,
      seedScoped,
      canToggleScoped,
    ],
  );
}
