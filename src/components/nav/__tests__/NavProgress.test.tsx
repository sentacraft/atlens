// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import NavProgress from "../NavProgress";

vi.mock("next/navigation", () => ({
  usePathname: () => "/en/lenses/x/browse",
  useSearchParams: () => new URLSearchParams(),
}));

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const IN_SITE = "/en/askiris";

function renderWithLink(onClick?: (event: React.MouseEvent) => void) {
  const { container } = render(
    <>
      <NavProgress />
      <a href={IN_SITE} onClick={onClick}>
        Ask Iris
      </a>
    </>,
  );
  fireEvent.click(screen.getByText("Ask Iris"));
  act(() => {
    vi.advanceTimersByTime(300);
  });
  return container.querySelector(".nav-progress");
}

describe("NavProgress", () => {
  it("starts on a click that navigates within the site", () => {
    expect(renderWithLink()).not.toBeNull();
  });

  // Regression: the nav's Ask Iris link opens the side panel instead of navigating, and the bar
  // ran until its 20-second failsafe.
  it("stays hidden when the link's own handler prevents the navigation", () => {
    expect(renderWithLink((event) => event.preventDefault())).toBeNull();
  });
});
