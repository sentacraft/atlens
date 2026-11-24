// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import FavoritesSection from "../FavoritesSection";
import type { LensSummary } from "@/lib/lens/data";

const favorites = vi.hoisted(() => ({ lensIds: [] as string[], isPending: true }));
vi.mock("@/hooks/useFavorites", () => ({
  useFavorites: () => ({ ...favorites, isFavorite: () => false, toggle: () => {} }),
}));
vi.mock("next-intl", () => {
  const t = (key: string) => key;
  t.has = () => true;
  return { useTranslations: () => t };
});
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, ...props }: { href: string }) => <a href={href} {...props} />,
}));
vi.mock("@/components/lens/LensActions", () => ({ default: () => null }));
vi.mock("@/hooks/useCompareToggle", () => ({ useCompareToggle: () => null }));

const lenses: LensSummary[] = [
  { id: "xf-18-55", brand: "fujifilm", series: "XF", model: "XF 18-55mm", mount: "X", focalLengthMin: 18, focalLengthMax: 55, maxAperture: [2.8, 4] },
];

function renderSection() {
  const heading = vi.fn((count: number | null) => <h2>{count === null ? "loading" : `count ${count}`}</h2>);
  render(<FavoritesSection id="favorites" className="" lenses={lenses} heading={heading} />);
  return heading;
}

afterEach(() => {
  cleanup();
  favorites.lensIds = [];
  favorites.isPending = true;
});

describe("FavoritesSection", () => {
  // The profile flashed "No favorites yet" for a moment before the favorites arrived.
  it("shows a placeholder, not the empty state, while favorites load", () => {
    renderSection();

    expect(screen.queryByText("noFavorites")).toBeNull();
    expect(screen.getByTestId("favorites-loading")).toBeInTheDocument();
    expect(screen.getByText("loading")).toBeInTheDocument();
  });

  it("shows the empty state once favorites have loaded and there are none", () => {
    favorites.isPending = false;
    renderSection();

    expect(screen.getByText("noFavorites")).toBeInTheDocument();
    expect(screen.queryByTestId("favorites-loading")).toBeNull();
  });

  it("lists loaded favorites", () => {
    favorites.isPending = false;
    favorites.lensIds = ["xf-18-55"];
    renderSection();

    expect(screen.getByText("XF 18-55mm")).toBeInTheDocument();
    expect(screen.getByText("count 1")).toBeInTheDocument();
  });
});
