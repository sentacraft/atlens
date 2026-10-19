// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import HomeHeroActions from "../HomeHeroActions";
import { HomeIrisStage } from "../HomeIrisStage";

const openIris = vi.fn();
const push = vi.fn();
const screenSize = vi.hoisted(() => ({ sm: true, lg: true }));

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("@/components/askiris/useStarters", () => ({ useStarters: () => [{ text: "A pancake lens that fits in a pocket", pool: "need" }] }));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  useRouter: () => ({ push }),
}));
vi.mock("@/context/IrisPanelProvider", () => ({ useOpenIris: () => openIris }));
vi.mock("@/hooks/useMountParam", () => ({ useEffectiveMount: () => "X" }));
vi.mock("@/hooks/useViewport", () => ({ useBreakpoint: (breakpoint: "sm" | "lg") => screenSize[breakpoint] }));

afterEach(() => {
  cleanup();
  openIris.mockClear();
  push.mockClear();
  screenSize.sm = true;
  screenSize.lg = true;
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

    expect(openIris).toHaveBeenCalledWith({
      from: "home",
      request: { kind: "question", text: "A pancake lens that fits in a pocket" },
      pool: "need",
    });
  });

  it("links straight to Ask Iris on a phone", () => {
    screenSize.sm = false;
    screenSize.lg = false;
    renderActions();

    expect(screen.getByRole("link", { name: /askIris/ })).toHaveAttribute("href", "/askiris");
  });

  it("goes to the Ask Iris page below the side panel's width, as home has no page to talk about", () => {
    screenSize.lg = false;
    renderActions();
    fireEvent.click(screen.getByRole("button", { name: /askIris/ }));
    fireEvent.click(screen.getByRole("button", { name: "A pancake lens that fits in a pocket" }));

    expect(push).toHaveBeenCalledWith("/askiris?q=A+pancake+lens+that+fits+in+a+pocket");
    expect(openIris).not.toHaveBeenCalled();
  });
});
