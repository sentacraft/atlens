// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import LensTable from "../LensTable";
import { resolveLens } from "@/lib/ai/recall";
import { getLensesByMount } from "@/lib/lens/data";

const scroll = vi.hoisted(() => ({ canScrollLeft: false, canScrollRight: false }));

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock("@/lib/analytics/analytics", () => ({ track: vi.fn() }));
vi.mock("@/hooks/useScrollAffordance", () => ({
  useScrollAffordance: () => ({ canScrollUp: false, canScrollDown: false, ...scroll }),
}));

afterEach(() => {
  cleanup();
  scroll.canScrollRight = false;
});

const lenses = getLensesByMount("X", "en")
  .slice(0, 2)
  .map((lens) => resolveLens(lens, "en", (brand) => brand));

describe("LensTable expand button", () => {
  it("is offered when the table scrolls sideways and the chat can widen", () => {
    scroll.canScrollRight = true;
    const onExpand = vi.fn();
    render(<LensTable lenses={lenses} columns={["weight"]} caption={null} onExpand={onExpand} />);
    fireEvent.click(screen.getByRole("button", { name: "expand" }));
    expect(onExpand).toHaveBeenCalledOnce();
  });

  it("is hidden while the table fits", () => {
    render(<LensTable lenses={lenses} columns={["weight"]} caption={null} onExpand={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "expand" })).toBeNull();
  });

  it("is hidden where the chat cannot widen", () => {
    scroll.canScrollRight = true;
    render(<LensTable lenses={lenses} columns={["weight"]} caption={null} />);
    expect(screen.queryByRole("button", { name: "expand" })).toBeNull();
  });
});
