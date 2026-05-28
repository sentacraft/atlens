// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { ReactNode } from "react";
import { CompareProvider, useCompare } from "@/context/CompareProvider";
import { useCompareLensSearch } from "../useCompareLensSearch";
import { MAX_COMPARE } from "@/lib/lens";
import type { Lens } from "@/lib/types";

vi.mock("@/hooks/useMountParam", () => ({
  useEffectiveMount: () => "X",
}));

vi.mock("@/lib/analytics", () => ({
  track: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

function wrapper({ children }: { children: ReactNode }) {
  return <CompareProvider>{children}</CompareProvider>;
}

const fakeLens = (id: string): Lens => ({ id } as Lens);

describe("useCompareLensSearch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getResultState returns addToCompareAction for a new lens", () => {
    const { result } = renderHook(() => useCompareLensSearch(), { wrapper });
    const state = result.current.getResultState(fakeLens("new-lens"));
    expect(state.actionLabel).toBe("addToCompareAction");
    expect(state.disabled).toBe(false);
  });

  it("getResultState returns alreadyAdded for a lens already in compare", () => {
    const { result } = renderHook(
      () => ({ search: useCompareLensSearch(), compare: useCompare() }),
      { wrapper },
    );
    act(() => result.current.compare.add("lens-a"));
    const state = result.current.search.getResultState(fakeLens("lens-a"));
    expect(state.actionLabel).toBe("alreadyAdded");
    expect(state.disabled).toBe(true);
  });

  it("getResultState returns compareFull when at MAX_COMPARE", () => {
    const { result } = renderHook(
      () => ({ search: useCompareLensSearch(), compare: useCompare() }),
      { wrapper },
    );
    for (let i = 0; i < MAX_COMPARE; i++) {
      act(() => result.current.compare.add(`lens-${i}`));
    }
    const state = result.current.search.getResultState(fakeLens("new-lens"));
    expect(state.actionLabel).toBe("compareFull");
    expect(state.disabled).toBe(true);
  });

  it("canAddMore is true when under limit", () => {
    const { result } = renderHook(() => useCompareLensSearch(), { wrapper });
    expect(result.current.canAddMore).toBe(true);
  });

  it("canAddMore is false when at limit", () => {
    const { result } = renderHook(
      () => ({ search: useCompareLensSearch(), compare: useCompare() }),
      { wrapper },
    );
    for (let i = 0; i < MAX_COMPARE; i++) {
      act(() => result.current.compare.add(`lens-${i}`));
    }
    expect(result.current.search.canAddMore).toBe(false);
  });

  it("onSelectLens adds the lens to compare", () => {
    const { result } = renderHook(
      () => ({ search: useCompareLensSearch(), compare: useCompare() }),
      { wrapper },
    );
    act(() => result.current.search.onSelectLens(fakeLens("lens-x")));
    expect(result.current.compare.compareIds).toContain("lens-x");
  });
});
