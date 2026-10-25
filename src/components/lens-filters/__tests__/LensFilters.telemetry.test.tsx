// @vitest-environment jsdom
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { defaultFilters, type FilterState } from "@/lib/lens/lens";
import { useFiltersTelemetry } from "../LensFilters.telemetry";

const track = vi.hoisted(() => vi.fn());
vi.mock("@/lib/analytics/analytics", () => ({ track }));

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  track.mockClear();
});

function render(initial: FilterState) {
  return renderHook(({ filters }) => useFiltersTelemetry(filters), {
    initialProps: { filters: initial },
    wrapper: StrictMode,
  });
}

describe("useFiltersTelemetry", () => {
  it("records nothing when the list first appears", () => {
    render(defaultFilters);
    act(() => vi.advanceTimersByTime(2000));

    expect(track).not.toHaveBeenCalled();
  });

  it("records the filters once they settle", () => {
    const { rerender } = render(defaultFilters);
    rerender({ filters: { ...defaultFilters, brands: ["sigma"] } });
    act(() => vi.advanceTimersByTime(1000));

    expect(track).toHaveBeenCalledExactlyOnceWith("filter_apply", {
      filters_json: JSON.stringify({ ...defaultFilters, brands: ["sigma"] }),
    });
  });

  it("records a reset when the filters go back to their defaults", () => {
    const { rerender } = render({ ...defaultFilters, brands: ["sigma"] });
    rerender({ filters: defaultFilters });
    act(() => vi.advanceTimersByTime(1000));

    expect(track.mock.calls).toEqual([["filter_reset"]]);
  });

  it("records nothing when only the sort order changes", () => {
    const { rerender } = render(defaultFilters);
    rerender({ filters: { ...defaultFilters, sort: "weightG" } });
    act(() => vi.advanceTimersByTime(1000));

    expect(track).not.toHaveBeenCalled();
  });
});
