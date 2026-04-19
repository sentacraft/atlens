"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { MAX_COMPARE } from "@/lib/lens";

interface CompareContextValue {
  compareIds: string[];
  toggleCompare: (id: string) => void;
  replaceCompare: (ids: string[]) => void;
  clearCompare: () => void;
  canToggle: (id: string) => boolean;
}

const CompareContext = createContext<CompareContextValue | null>(null);

export function CompareProvider({ children }: { children: React.ReactNode }) {
  const [compareIds, setCompareIds] = useState<string[]>([]);

  const toggleCompare = useCallback((id: string) => {
    setCompareIds((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length < MAX_COMPARE
          ? [...prev, id]
          : prev
    );
  }, []);

  const replaceCompare = useCallback((ids: string[]) => {
    const nextIds = Array.from(new Set(ids)).slice(0, MAX_COMPARE);

    setCompareIds((prev) => {
      if (
        prev.length === nextIds.length &&
        prev.every((id, index) => id === nextIds[index])
      ) {
        return prev;
      }

      return nextIds;
    });
  }, []);

  const clearCompare = useCallback(() => {
    setCompareIds([]);
  }, []);

  const value = useMemo(
    () => ({
      compareIds,
      toggleCompare,
      replaceCompare,
      clearCompare,
      canToggle: (id: string) =>
        compareIds.includes(id) || compareIds.length < MAX_COMPARE,
    }),
    [clearCompare, compareIds, replaceCompare, toggleCompare]
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
