// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import LensActions, { type CompareControl } from "../LensActions";

const mocks = vi.hoisted(() => ({ toast: vi.fn(), toggleFavorite: vi.fn(), favorited: false }));

vi.mock("sonner", () => ({ toast: mocks.toast }));
vi.mock("@/hooks/useFavorites", () => ({
  useFavorites: () => ({ isFavorite: () => mocks.favorited, toggle: mocks.toggleFavorite, lensIds: [] }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mocks.favorited = false;
});

function renderActions(tier: "panel" | "row" | "inline" | "dense", compare: Partial<CompareControl> = {}) {
  const control: CompareControl = { selected: false, full: false, onToggle: vi.fn(), ...compare };
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <LensActions lensId="lens-a" lensName="XF 33mm" compare={control} tier={tier} />
    </NextIntlClientProvider>,
  );
  return control;
}

describe("LensActions", () => {
  it("puts favorite before compare in every tier", () => {
    for (const tier of ["panel", "row", "inline", "dense"] as const) {
      renderActions(tier);
      const names = screen.getAllByRole("button").map((button) => button.getAttribute("aria-label") ?? button.textContent);
      expect(names[0], tier).toMatch(/Favorite/);
      expect(names[1], tier).toMatch(/Compare/);
      cleanup();
    }
  });

  it("spells out both actions on a panel and labels compare on a row", () => {
    renderActions("panel");
    expect(screen.getByRole("button", { name: "Favorite" })).toHaveTextContent("Favorite");
    expect(screen.getByRole("button", { name: "Add to Compare" })).toHaveTextContent("Compare");
    cleanup();

    renderActions("row");
    expect(screen.getByRole("button", { name: "Favorite: XF 33mm" })).toHaveTextContent("");
    expect(screen.getByRole("button", { name: "Add to Compare: XF 33mm" })).toHaveTextContent("Compare");
  });

  it("keeps compare clickable when the list is full and says so instead of toggling", () => {
    const control = renderActions("row", { full: true });
    const compare = screen.getByRole("button", { name: /Compare List Full/ });

    expect(compare).toBeEnabled();
    fireEvent.click(compare);
    expect(control.onToggle).not.toHaveBeenCalled();
    expect(mocks.toast).toHaveBeenCalledWith(en.LensList.compareFullToast);
  });

  it("toggles the favorite and the compare entry", () => {
    const control = renderActions("panel");
    fireEvent.click(screen.getByRole("button", { name: "Favorite" }));
    fireEvent.click(screen.getByRole("button", { name: "Add to Compare" }));

    expect(mocks.toggleFavorite).toHaveBeenCalledWith("lens-a");
    expect(control.onToggle).toHaveBeenCalledOnce();
  });

  it("shows favorite alone when the place has no compare bar", () => {
    for (const tier of ["panel", "row", "inline", "dense"] as const) {
      render(
        <NextIntlClientProvider locale="en" messages={en}>
          <LensActions lensId="lens-a" lensName="XF 33mm" compare={null} tier={tier} />
        </NextIntlClientProvider>,
      );
      const names = screen.getAllByRole("button").map((button) => button.getAttribute("aria-label") ?? button.textContent);
      expect(names, tier).toHaveLength(1);
      expect(names[0], tier).toMatch(/Favorite/);
      cleanup();
    }
  });

  it("shows the selected states", () => {
    mocks.favorited = true;
    renderActions("panel", { selected: true });

    expect(screen.getByRole("button", { name: "Favorited" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Remove from Compare" })).toHaveTextContent(en.LensList.compared);
  });
});
