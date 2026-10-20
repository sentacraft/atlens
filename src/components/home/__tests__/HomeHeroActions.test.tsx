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
vi.mock("@/context/IrisPanelProvider", () => ({ useIris: () => ({ openIris, closeIris: vi.fn(), irisShown: false }) }));
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

  it("opens Iris on a phone", () => {
    screenSize.sm = false;
    screenSize.lg = false;
    renderActions();
    fireEvent.click(screen.getByRole("button", { name: /askIris/ }));

    expect(openIris).toHaveBeenCalledWith({ from: "home" });
  });

  it("opens Iris with the question below the side panel's width too", () => {
    screenSize.lg = false;
    renderActions();
    fireEvent.click(screen.getByRole("button", { name: /askIris/ }));
    fireEvent.click(screen.getByRole("button", { name: "A pancake lens that fits in a pocket" }));

    expect(push).not.toHaveBeenCalled();
    expect(openIris).toHaveBeenCalledWith({
      from: "home",
      request: { kind: "question", text: "A pancake lens that fits in a pocket" },
      pool: "need",
    });
  });
});
