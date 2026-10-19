// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const nav = vi.hoisted(() => ({
  push: vi.fn(),
  pathname: "/admin/analytics/iris",
  search: "range=7d",
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: nav.push }),
  usePathname: () => nav.pathname,
  useSearchParams: () => new URLSearchParams(nav.search),
}));

// jsdom has no layout, so it lacks scrollIntoView.
Element.prototype.scrollIntoView = vi.fn();

const { default: AnalyticsFrame } = await import("../AnalyticsFrame");

afterEach(() => {
  cleanup();
  nav.push.mockReset();
});

function renderFrame() {
  render(
    <AnalyticsFrame>
      <p>content</p>
    </AnalyticsFrame>,
  );
}

describe("AnalyticsFrame", () => {
  it("marks the current tab and range", () => {
    renderFrame();

    expect(screen.getByRole("link", { name: "Ask Iris" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "7 days" })).toHaveAttribute("aria-current", "true");
  });

  it("switches range on the same tab without scrolling to the top", () => {
    renderFrame();

    fireEvent.click(screen.getByRole("link", { name: "90 days" }));

    expect(nav.push).toHaveBeenCalledWith("/admin/analytics/iris?range=90d", { scroll: false });
  });

  it("keeps the range when switching tabs, and starts the new tab at the top", () => {
    renderFrame();

    fireEvent.click(screen.getByRole("link", { name: "Conversion" }));

    expect(nav.push).toHaveBeenCalledWith("/admin/analytics/conversion?range=7d", { scroll: true });
  });

  it("leaves a modified click to the browser", () => {
    renderFrame();

    fireEvent.click(screen.getByRole("link", { name: "Overview" }), { metaKey: true });

    expect(nav.push).not.toHaveBeenCalled();
  });
});
