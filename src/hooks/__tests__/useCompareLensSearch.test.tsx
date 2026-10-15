// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { ReactNode } from "react";
import { CompareProvider, useCompare } from "@/context/CompareProvider";
import { useCompareLensSearch } from "../useCompareLensSearch";
import { MAX_COMPARE } from "@/lib/lens/lens";
import type { Lens } from "@/lib/types";

vi.mock("@/hooks/useMountParam", () => ({
  useEffectiveMount: () => "X",
}));

vi.mock("@/lib/analytics/analytics", () => ({
  track: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/components/browse/LensSearchDialog", () => ({ suggestLensFooter: () => null }));

function wrapper({ children }: { children: ReactNode }) {
  return <CompareProvider>{children}</CompareProvider>;
}

const fakeLens = (id: string): Lens => ({ id } as Lens);

function renderWithCompare() {
  return renderHook(() => ({ search: useCompareLensSearch(), compare: useCompare() }), { wrapper });
}

describe("useCompareLensSearch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("offers to add a lens that is not in compare yet", () => {
    const { result } = renderWithCompare();
    expect(result.current.search.dialogProps.resultAction(fakeLens("new-lens"))).toEqual({
      label: "addToCompareAction",
    });
  });

  it("disables a lens already in compare", () => {
    const { result } = renderWithCompare();
    act(() => result.current.compare.add("lens-a"));
    expect(result.current.search.dialogProps.resultAction(fakeLens("lens-a"))).toEqual({
      label: "alreadyAdded",
      disabled: true,
    });
  });

  it("disables every new lens once compare is full", () => {
    const { result } = renderWithCompare();
    for (let i = 0; i < MAX_COMPARE; i++) {
      act(() => result.current.compare.add(`lens-${i}`));
    }
    expect(result.current.search.dialogProps.resultAction(fakeLens("new-lens"))).toEqual({
      label: "compareFull",
      disabled: true,
    });
    expect(result.current.search.canAddMore).toBe(false);
  });

  it("is under the limit with an empty compare", () => {
    const { result } = renderWithCompare();
    expect(result.current.search.canAddMore).toBe(true);
  });

  it("adds the picked lens and closes the dialog", () => {
    const { result } = renderWithCompare();
    act(() => result.current.search.openSearch());
    expect(result.current.search.dialogProps.open).toBe(true);

    act(() => result.current.search.dialogProps.onSelect(fakeLens("lens-x")));

    expect(result.current.compare.compareIds).toContain("lens-x");
    expect(result.current.search.dialogProps.open).toBe(false);
  });
});
