// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { IrisPanelProvider, useOpenIris } from "../IrisPanelProvider";
import { track } from "@/lib/analytics/analytics";

const push = vi.fn();
const env = vi.hoisted(() => ({ wide: true, pathname: "/lenses/x/browse" }));

vi.mock("@/i18n/navigation", () => ({
  usePathname: () => env.pathname,
  useRouter: () => ({ push }),
}));
vi.mock("@/hooks/useViewport", () => ({ useBreakpoint: () => env.wide }));
vi.mock("@/lib/analytics/analytics", () => ({ track: vi.fn() }));
vi.mock("@/components/iris-panel/IrisPanel", () => ({
  default: ({ layout, shown, request }: { layout: string; shown: boolean; request: { kind: string; text?: string } | null }) => (
    <div data-testid="panel" data-layout={layout} data-shown={String(shown)}>
      {request?.text}
    </div>
  ),
}));

afterEach(() => {
  cleanup();
  push.mockClear();
  env.wide = true;
  env.pathname = "/lenses/x/browse";
  document.documentElement.style.removeProperty("--iris-panel-width");
});

function Ask() {
  const openIris = useOpenIris();
  return (
    <>
      <button type="button" onClick={() => openIris({ from: "lens", request: { kind: "question", text: "Which 23mm?" } })}>
        ask
      </button>
      <button type="button" onClick={() => openIris({ from: "nav" })}>
        nav
      </button>
    </>
  );
}

function renderProvider() {
  render(
    <IrisPanelProvider>
      <Ask />
    </IrisPanelProvider>,
  );
}

describe("IrisPanelProvider", () => {
  it("opens the side panel on a wide screen, makes room for it, and sends the question there", () => {
    render(
      <IrisPanelProvider>
        <Ask />
      </IrisPanelProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "ask" }));

    expect(screen.getByTestId("panel")).toHaveAttribute("data-shown", "true");
    expect(screen.getByTestId("panel")).toHaveTextContent("Which 23mm?");
    expect(document.documentElement.style.getPropertyValue("--iris-panel-width")).toBe("400px");
    expect(push).not.toHaveBeenCalled();
    expect(track).toHaveBeenLastCalledWith("askiris_open", { entry: "lens", surface: "panel", pool: undefined });
  });

  it("opens a bottom sheet on a narrow screen, without making room beside the page", () => {
    env.wide = false;
    renderProvider();
    fireEvent.click(screen.getByRole("button", { name: "ask" }));

    expect(screen.getByTestId("panel")).toHaveAttribute("data-layout", "sheet");
    expect(screen.getByTestId("panel")).toHaveAttribute("data-shown", "true");
    expect(screen.getByTestId("panel")).toHaveTextContent("Which 23mm?");
    expect(document.documentElement.style.getPropertyValue("--iris-panel-width")).toBe("0px");
    expect(push).not.toHaveBeenCalled();
    expect(track).toHaveBeenLastCalledWith("askiris_open", { entry: "lens", surface: "sheet", pool: undefined });
  });

  it("sends the nav to the Ask Iris page on a narrow screen", () => {
    env.wide = false;
    renderProvider();
    fireEvent.click(screen.getByRole("button", { name: "nav" }));

    expect(push).toHaveBeenCalledWith("/askiris");
    expect(screen.queryByTestId("panel")).toBeNull();
    expect(track).toHaveBeenLastCalledWith("askiris_open", { entry: "nav", surface: "page", pool: undefined });
  });
});
