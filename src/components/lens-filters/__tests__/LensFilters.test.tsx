// @vitest-environment jsdom
import { useState } from "react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { defaultFilters, type FilterState, type AvailableFilterOptions } from "@/lib/lens/lens";
import messages from "@/messages/en.json";
import LensFilters from "../LensFilters";

vi.mock("../LensFilters.telemetry", () => ({ useFiltersTelemetry: vi.fn() }));

const available: AvailableFilterOptions = {
  brands: ["fujifilm"], types: ["prime", "zoom"], focusModes: ["auto", "manual"],
  focalCategories: ["wide", "standard"], features: [], opticalTraits: [], focusMotorClasses: [],
};

function Harness({ initial = defaultFilters }: { initial?: FilterState }) {
  const [filters, setFilters] = useState(initial);
  return (
    <NextIntlClientProvider locale="en" messages={messages}>
      <LensFilters mount="X" filters={filters} available={available} onFiltersChange={setFilters} activeFilterCount={filters.focalLength?.value != null || filters.focalCategories.length ? 1 : 0} onReset={() => setFilters(defaultFilters)} assistSlot={null} />
      <output data-testid="filters">{JSON.stringify(filters)}</output>
    </NextIntlClientProvider>
  );
}

function current(): FilterState {
  return JSON.parse(screen.getByTestId("filters").textContent ?? "{}");
}

async function selectMode(name: string) {
  fireEvent.click(screen.getByRole("button", { name: "Focal filtering" }));
  fireEvent.click(await screen.findByRole("menuitemradio", { name }));
}

beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: vi.fn((key: string, value: string) => { values.set(key, value); }),
  });
});

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("LensFilters", () => {
  it("makes focal presets and coverage mutually exclusive through one mode menu", async () => {
    render(<Harness initial={{ ...defaultFilters, focalCategories: ["wide"] }} />);
    await selectMode("Cover a focal length");
    expect(current().focalCategories).toEqual([]);
    expect(current().focalLength).toEqual({ value: null, reference: "equivalent" });
    const input = screen.getByRole("textbox", { name: "Custom focal length" });
    fireEvent.change(input, { target: { value: "40" } });
    fireEvent.blur(input);
    expect(current().focalLength?.value).toBe(40);
    expect(screen.queryByRole("button", { name: "Standard" })).toBeNull();
    await selectMode("By focal range");
    expect(current().focalLength).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Standard" }));
    expect(current().focalCategories).toEqual(["standard"]);
    expect(screen.queryByRole("textbox", { name: "Custom focal length" })).toBeNull();
  });

  it("defaults to equivalent even when an old physical-reference preference exists", async () => {
    window.localStorage.setItem("atlens_focal_reference_v1", "actual");
    render(<Harness />);
    await selectMode("Cover a focal length");
    expect(current().focalLength).toEqual({ value: null, reference: "equivalent" });
  });

  it("preserves an explicit physical-reference filter until a new coverage selection", async () => {
    render(<Harness initial={{ ...defaultFilters, focalLength: { value: 40, reference: "actual" } }} />);
    expect(current().focalLength).toEqual({ value: 40, reference: "actual" });
    await selectMode("By focal range");
    await selectMode("Cover a focal length");
    expect(current().focalLength).toEqual({ value: null, reference: "equivalent" });
  });

  it("converts the reference without persisting it", async () => {
    render(<Harness initial={{ ...defaultFilters, focalLength: { value: 40, reference: "equivalent" } }} />);
    fireEvent.click(screen.getByRole("button", { name: "Focal length convention" }));
    fireEvent.click(await screen.findByRole("menuitemradio", { name: "Actual" }));
    expect(current().focalLength?.reference).toBe("actual");
    expect(current().focalLength?.value).toBeCloseTo(40 / 1.5);
    expect(window.localStorage.setItem).not.toHaveBeenCalled();
  });

  it("places the coverage note beside the mode rather than the reference", () => {
    render(<Harness initial={{ ...defaultFilters, focalLength: { value: 40, reference: "equivalent" } }} />);
    const mode = screen.getByRole("button", { name: "Focal filtering" });
    expect(within(mode.parentElement!).getByRole("button", { name: messages.Common.additionalInfo })).toBeTruthy();
    expect(mode.parentElement!.contains(screen.getByRole("button", { name: "Focal length convention" }))).toBe(false);
  });

  it("discards an uncommitted focal draft on reset", async () => {
    render(<Harness initial={{ ...defaultFilters, focalLength: { value: 40, reference: "equivalent" } }} />);
    fireEvent.change(screen.getByRole("textbox", { name: "Custom focal length" }), { target: { value: "55" } });
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(current().focalLength).toBeNull();
    await selectMode("Cover a focal length");
    expect((screen.getByRole("textbox", { name: "Custom focal length" }) as HTMLInputElement).value).toBe("");
  });
});
