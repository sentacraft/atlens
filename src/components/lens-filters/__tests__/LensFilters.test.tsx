// @vitest-environment jsdom
import { useState } from "react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";
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

function focalGroup() {
  return within(screen.getByRole("group", { name: "Focal length" }));
}

function openCoverage() {
  fireEvent.click(screen.getByRole("button", { name: "Cover a focal length" }));
  return screen.getByRole("textbox", { name: "Custom focal length" });
}

afterEach(cleanup);

describe("LensFilters inline coverage", () => {
  it("opens an equivalent input in the same row without hiding the focal presets", () => {
    render(<Harness initial={{ ...defaultFilters, focalCategories: ["wide"] }} />);
    const input = openCoverage();
    expect(current().focalCategories).toEqual([]);
    expect(current().focalLength).toEqual({ value: null, reference: "equivalent" });
    expect(document.activeElement).toBe(input);
    expect(focalGroup().getByRole("button", { name: "Standard" })).toBeTruthy();
    expect(focalGroup().getByRole("button", { name: "All" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("keeps drafts local, then applies coverage and deselects All", () => {
    render(<Harness />);
    const input = openCoverage();
    fireEvent.change(input, { target: { value: "40" } });
    expect(current().focalLength?.value).toBeNull();
    fireEvent.blur(input);
    expect(current().focalLength).toEqual({ value: 40, reference: "equivalent" });
    expect(focalGroup().getByRole("button", { name: "All" }).getAttribute("aria-pressed")).toBe("false");
    expect(focalGroup().getByRole("button", { name: "Standard" }).getAttribute("aria-pressed")).toBe("false");
  });

  it("uses All to exit coverage and discards the input draft", () => {
    render(<Harness initial={{ ...defaultFilters, focalLength: { value: 40, reference: "equivalent" } }} />);
    fireEvent.change(screen.getByRole("textbox", { name: "Custom focal length" }), { target: { value: "55" } });
    fireEvent.click(focalGroup().getByRole("button", { name: "All" }));
    expect(current().focalLength).toBeNull();
    expect(current().focalCategories).toEqual([]);
    expect(screen.queryByRole("textbox", { name: "Custom focal length" })).toBeNull();
    const input = openCoverage();
    expect((input as HTMLInputElement).value).toBe("");
  });

  it("uses a focal preset to exit coverage without a separate mode switch", () => {
    render(<Harness initial={{ ...defaultFilters, focalLength: { value: 40, reference: "equivalent" } }} />);
    fireEvent.click(focalGroup().getByRole("button", { name: "Standard" }));
    expect(current().focalLength).toBeNull();
    expect(current().focalCategories).toEqual(["standard"]);
    expect(screen.queryByRole("textbox", { name: "Custom focal length" })).toBeNull();
  });

  it("preserves explicit URL references without opening the keyboard", () => {
    render(<Harness initial={{ ...defaultFilters, focalLength: { value: 40, reference: "actual" } }} />);
    const input = screen.getByRole("textbox", { name: "Custom focal length" });
    expect(current().focalLength).toEqual({ value: 40, reference: "actual" });
    expect(document.activeElement).not.toBe(input);
    fireEvent.click(focalGroup().getByRole("button", { name: "All" }));
    openCoverage();
    expect(current().focalLength).toEqual({ value: null, reference: "equivalent" });
  });

  it("keeps the convention menu and matching note inside the coverage control", async () => {
    render(<Harness initial={{ ...defaultFilters, focalLength: { value: 40, reference: "equivalent" } }} />);
    const chip = within(screen.getByRole("group", { name: "Cover a focal length" }));
    fireEvent.click(chip.getByRole("button", { name: "Focal length convention" }));
    expect(await screen.findByText(messages.LensList.focalTolerance)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /clear|remove/i })).toBeNull();
    expect(screen.queryByRole("menuitem", { name: /clear|remove/i })).toBeNull();
    fireEvent.click(await screen.findByRole("menuitemradio", { name: "Actual" }));
    expect(current().focalLength?.reference).toBe("actual");
    expect(current().focalLength?.value).toBeCloseTo(40 / 1.5);
    fireEvent.blur(screen.getByRole("textbox", { name: "Custom focal length" }));
    expect(current().focalLength?.value).toBe(40 / 1.5);
  });

  it("rejects invalid drafts without changing the applied coverage", () => {
    render(<Harness initial={{ ...defaultFilters, focalLength: { value: 40, reference: "equivalent" } }} />);
    const input = screen.getByRole("textbox", { name: "Custom focal length" });
    fireEvent.change(input, { target: { value: "-2" } });
    fireEvent.blur(input);
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(current().focalLength?.value).toBe(40);
    fireEvent.keyDown(input, { key: "Escape" });
    fireEvent.blur(input);
    expect((input as HTMLInputElement).value).toBe("40");
    expect(current().focalLength?.value).toBe(40);
  });

  it("discards an uncommitted focal draft on reset", () => {
    render(<Harness initial={{ ...defaultFilters, focalLength: { value: 40, reference: "equivalent" } }} />);
    fireEvent.change(screen.getByRole("textbox", { name: "Custom focal length" }), { target: { value: "55" } });
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(current().focalLength).toBeNull();
    expect((openCoverage() as HTMLInputElement).value).toBe("");
  });
});
