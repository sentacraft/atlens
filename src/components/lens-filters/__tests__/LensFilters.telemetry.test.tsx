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

    expect(track).toHaveBeenCalledExactlyOnceWith("filter_apply", { filters_json: '{"brands":["sigma"]}' });
  });

  it("keeps every brand of a long selection within the prop length limit", () => {
    const brands = ["fujifilm", "sigma", "tamron", "viltrox", "ttartisan", "7artisans", "laowa", "sgimage", "meike"];
    const { rerender } = render(defaultFilters);
    rerender({ filters: { ...defaultFilters, brands, features: ["ois", "wr"], typeFilter: "prime", sort: "weightG" } });
    act(() => vi.advanceTimersByTime(1000));

    const json = track.mock.calls[0][1].filters_json;
    expect(json.length).toBeLessThanOrEqual(256);
    expect(JSON.parse(json)).toEqual({ brands, typeFilter: "prime", features: ["ois", "wr"], sort: "weightG" });
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
