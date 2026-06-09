// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { ReactNode } from "react";
import { CompareProvider, useCompare } from "../CompareProvider";
import { MAX_COMPARE } from "@/lib/lens/lens";

vi.mock("@/hooks/useMountParam", () => ({
  useEffectiveMount: () => "X",
}));

vi.mock("@/lib/analytics/analytics", () => ({
  track: vi.fn(),
}));

function wrapper({ children }: { children: ReactNode }) {
  return <CompareProvider>{children}</CompareProvider>;
}

describe("useCompare", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts with empty compareIds", () => {
    const { result } = renderHook(() => useCompare(), { wrapper });
    expect(result.current.compareIds).toEqual([]);
  });

  // --- add ---
  describe("add", () => {
    it("adds a lens id", () => {
      const { result } = renderHook(() => useCompare(), { wrapper });
      act(() => result.current.add("lens-a"));
      expect(result.current.compareIds).toEqual(["lens-a"]);
    });

    it("does not add duplicates", () => {
      const { result } = renderHook(() => useCompare(), { wrapper });
      act(() => result.current.add("lens-a"));
      act(() => result.current.add("lens-a"));
      expect(result.current.compareIds).toEqual(["lens-a"]);
    });

    it("respects MAX_COMPARE limit", () => {
      const { result } = renderHook(() => useCompare(), { wrapper });
      for (let i = 0; i < MAX_COMPARE + 2; i++) {
        act(() => result.current.add(`lens-${i}`));
      }
      expect(result.current.compareIds).toHaveLength(MAX_COMPARE);
    });
  });

  // --- remove ---
  describe("remove", () => {
    it("removes an existing id", () => {
      const { result } = renderHook(() => useCompare(), { wrapper });
      act(() => result.current.add("lens-a"));
      act(() => result.current.add("lens-b"));
      act(() => result.current.remove("lens-a"));
      expect(result.current.compareIds).toEqual(["lens-b"]);
    });

    it("no-ops when removing a non-existent id", () => {
      const { result } = renderHook(() => useCompare(), { wrapper });
      act(() => result.current.add("lens-a"));
      act(() => result.current.remove("lens-z"));
      expect(result.current.compareIds).toEqual(["lens-a"]);
    });
  });

  // --- toggle ---
  describe("toggle", () => {
    it("adds when not present", () => {
      const { result } = renderHook(() => useCompare(), { wrapper });
      act(() => result.current.toggle("lens-a"));
      expect(result.current.compareIds).toContain("lens-a");
    });

    it("removes when present", () => {
      const { result } = renderHook(() => useCompare(), { wrapper });
      act(() => result.current.add("lens-a"));
      act(() => result.current.toggle("lens-a"));
      expect(result.current.compareIds).not.toContain("lens-a");
    });

    it("does not add when already at MAX_COMPARE", () => {
      const { result } = renderHook(() => useCompare(), { wrapper });
      for (let i = 0; i < MAX_COMPARE; i++) {
        act(() => result.current.add(`lens-${i}`));
      }
      act(() => result.current.toggle("lens-new"));
      expect(result.current.compareIds).toHaveLength(MAX_COMPARE);
      expect(result.current.compareIds).not.toContain("lens-new");
    });
  });

  // --- reorder ---
  describe("reorder", () => {
    it("swaps two positions", () => {
      const { result } = renderHook(() => useCompare(), { wrapper });
      act(() => result.current.add("a"));
      act(() => result.current.add("b"));
      act(() => result.current.add("c"));
      act(() => result.current.reorder(0, 2));
      expect(result.current.compareIds).toEqual(["c", "b", "a"]);
    });

    it("no-ops when fromIndex equals toIndex", () => {
      const { result } = renderHook(() => useCompare(), { wrapper });
      act(() => result.current.add("a"));
      act(() => result.current.add("b"));
      act(() => result.current.reorder(0, 0));
      expect(result.current.compareIds).toEqual(["a", "b"]);
    });

    it("no-ops when indices are out of bounds", () => {
      const { result } = renderHook(() => useCompare(), { wrapper });
      act(() => result.current.add("a"));
      act(() => result.current.reorder(-1, 0));
      expect(result.current.compareIds).toEqual(["a"]);
      act(() => result.current.reorder(0, 5));
      expect(result.current.compareIds).toEqual(["a"]);
    });
  });

  // --- clear ---
  describe("clear", () => {
    it("empties the list", () => {
      const { result } = renderHook(() => useCompare(), { wrapper });
      act(() => result.current.add("a"));
      act(() => result.current.add("b"));
      act(() => result.current.clear());
      expect(result.current.compareIds).toEqual([]);
    });

    it("no-ops when already empty", () => {
      const { result } = renderHook(() => useCompare(), { wrapper });
      act(() => result.current.clear());
      expect(result.current.compareIds).toEqual([]);
    });
  });

  // --- seed ---
  describe("seed", () => {
    it("replaces the entire list", () => {
      const { result } = renderHook(() => useCompare(), { wrapper });
      act(() => result.current.add("old"));
      act(() => result.current.seed(["a", "b", "c"]));
      expect(result.current.compareIds).toEqual(["a", "b", "c"]);
    });

    it("deduplicates input ids", () => {
      const { result } = renderHook(() => useCompare(), { wrapper });
      act(() => result.current.seed(["a", "a", "b"]));
      expect(result.current.compareIds).toEqual(["a", "b"]);
    });

    it("truncates to MAX_COMPARE", () => {
      const { result } = renderHook(() => useCompare(), { wrapper });
      const ids = Array.from({ length: MAX_COMPARE + 3 }, (_, i) => `lens-${i}`);
      act(() => result.current.seed(ids));
      expect(result.current.compareIds).toHaveLength(MAX_COMPARE);
    });

    it("no-ops when seed matches current state", () => {
      const { result } = renderHook(() => useCompare(), { wrapper });
      act(() => result.current.seed(["a", "b"]));
      const before = result.current.compareIds;
      act(() => result.current.seed(["a", "b"]));
      expect(result.current.compareIds).toBe(before);
    });
  });

  // --- context guard ---
  it("throws when used outside CompareProvider", () => {
    expect(() => {
      renderHook(() => useCompare());
    }).toThrow("useCompare must be used within CompareProvider");
  });
});
