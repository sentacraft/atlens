// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import HomeHeroActions from "../HomeHeroActions";
import { HomeIrisStage } from "../HomeIrisStage";

const openIris = vi.fn();
const wide = vi.hoisted(() => ({ value: true }));

vi.mock("next-intl", () => ({
  useTranslations: () =>
    Object.assign((key: string) => key, { raw: () => ["A pancake lens that fits in a pocket"] }),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("@/context/IrisPanelProvider", () => ({ useOpenIris: () => openIris }));
vi.mock("@/hooks/useMountParam", () => ({ useEffectiveMount: () => "X" }));
vi.mock("@/hooks/useViewport", () => ({ useBreakpoint: () => wide.value }));

afterEach(() => {
  cleanup();
  openIris.mockClear();
  wide.value = true;
});

function renderActions() {
  render(
    <HomeIrisStage>
      <HomeHeroActions />
    </HomeIrisStage>,
  );
}

describe("HomeHeroActions", () => {
  it("opens Ask Iris in place, and Escape closes it", () => {
    renderActions();
    fireEvent.click(screen.getByRole("button", { name: /askIris/ }));
    expect(screen.getByPlaceholderText("irisPlaceholder")).toHaveFocus();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.getByRole("button", { name: /askIris/ })).toHaveAttribute("aria-expanded", "false");
  });

  it("hands an example to Ask Iris as a question to send", () => {
    renderActions();
    fireEvent.click(screen.getByRole("button", { name: /askIris/ }));
    fireEvent.click(screen.getByRole("button", { name: "A pancake lens that fits in a pocket" }));

    expect(openIris).toHaveBeenCalledWith({ question: "A pancake lens that fits in a pocket" });
  });

  it("links straight to Ask Iris on a phone", () => {
    wide.value = false;
    renderActions();

    expect(screen.getByRole("link", { name: /askIris/ })).toHaveAttribute("href", "/askiris");
  });
});
