// @vitest-environment jsdom
import { useState } from "react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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

beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  });
});

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("LensFilters", () => {
  it("makes focal presets and custom mutually exclusive", () => {
    render(<Harness initial={{ ...defaultFilters, focalCategories: ["wide"] }} />);
    fireEvent.click(screen.getByRole("button", { name: "Cover a focal length" }));
    expect(current().focalCategories).toEqual([]);
    expect(current().focalLength).toEqual({ value: null, reference: "equivalent" });
    const input = screen.getByRole("textbox", { name: "Custom focal length" });
    fireEvent.change(input, { target: { value: "40" } });
    fireEvent.blur(input);
    expect(current().focalLength?.value).toBe(40);
    expect(screen.queryByRole("button", { name: "Standard" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Browse focal ranges" }));
    expect(current().focalLength).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Standard" }));
    expect(current().focalLength).toBeNull();
    expect(current().focalCategories).toEqual(["standard"]);
    expect(screen.queryByRole("textbox", { name: "Custom focal length" })).toBeNull();
  });

  it("uses the remembered reference only when entering custom without an explicit URL value", () => {
    window.localStorage.setItem("atlens_focal_reference_v1", "actual");
    render(<Harness initial={{ ...defaultFilters, focalLength: { value: 40, reference: "equivalent" } }} />);
    expect(current().focalLength?.reference).toBe("equivalent");
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    fireEvent.click(screen.getByRole("button", { name: "Cover a focal length" }));
    expect(current().focalLength).toEqual({ value: null, reference: "actual" });
  });

  it("discards an uncommitted focal draft on reset", () => {
    render(<Harness initial={{ ...defaultFilters, focalLength: { value: 40, reference: "equivalent" } }} />);
    fireEvent.change(screen.getByRole("textbox", { name: "Custom focal length" }), { target: { value: "55" } });
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(current().focalLength).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Cover a focal length" }));
    expect((screen.getByRole("textbox", { name: "Custom focal length" }) as HTMLInputElement).value).toBe("");
  });
});
