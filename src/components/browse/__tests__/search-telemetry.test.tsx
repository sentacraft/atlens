// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const track = vi.fn();
vi.mock("@/lib/analytics/analytics", () => ({ track }));

const { useSearchTelemetry } = await import("../LensSearchDialog.telemetry");

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  track.mockClear();
});

describe("useSearchTelemetry", () => {
  it("records the query after a pause", () => {
    renderHook(() => useSearchTelemetry({ query: "xf 35", resultsCount: 2, isOpen: true, isComposing: false }));
    vi.advanceTimersByTime(500);
    expect(track).toHaveBeenCalledWith("search", { query: "xf 35", results_count: 2 });
  });

  it("records the final query when the dialog closes inside the pause", () => {
    const { rerender } = renderHook((props) => useSearchTelemetry(props), {
      initialProps: { query: "xf 35", resultsCount: 2, isOpen: true, isComposing: false },
    });
    rerender({ query: "xf 35", resultsCount: 2, isOpen: false, isComposing: false });
    vi.advanceTimersByTime(1000);
    expect(track).toHaveBeenCalledTimes(1);
  });

  it("does not record a query that was cleared before closing", () => {
    const { rerender } = renderHook((props) => useSearchTelemetry(props), {
      initialProps: { query: "xf", resultsCount: 2, isOpen: true, isComposing: false },
    });
    rerender({ query: "", resultsCount: 0, isOpen: true, isComposing: false });
    rerender({ query: "", resultsCount: 0, isOpen: false, isComposing: false });
    vi.advanceTimersByTime(1000);
    expect(track).not.toHaveBeenCalled();
  });
});
