// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { IrisPanelProvider, useIris } from "../IrisPanelProvider";
import { track } from "@/lib/analytics/analytics";
import { askIrisPagePath } from "@/lib/url/askiris";

const push = vi.fn();
const env = vi.hoisted(() => ({ wide: true, pathname: "/lenses/x/browse" }));

vi.mock("@/i18n/navigation", () => ({
  usePathname: () => env.pathname,
  useRouter: () => ({ push }),
}));
vi.mock("@/hooks/useViewport", () => ({ useBreakpoint: () => env.wide }));
vi.mock("@/lib/analytics/analytics", () => ({ track: vi.fn() }));
vi.mock("@/components/iris-panel/IrisPanel", () => ({
  default: ({
    shown,
    request,
  }: {
    shown: boolean;
    request: { id: number; kind: string; text?: string; conversationId?: string } | null;
  }) => (
    <div
      data-testid="panel"
      data-shown={String(shown)}
      data-request={request ? `${request.id}:${request.kind}` : ""}
    >
      {request?.text ?? request?.conversationId}
    </div>
  ),
}));

afterEach(() => {
  cleanup();
  push.mockClear();
  env.wide = true;
  env.pathname = "/lenses/x/browse";
  document.documentElement.style.removeProperty("--iris-panel-width");
  window.history.replaceState(null, "", "/");
});

function Ask() {
  const { openIris, closeIris, irisShown } = useIris();
  return (
    <>
      <span data-testid="shown">{String(irisShown)}</span>
      <button type="button" onClick={closeIris}>
        close
      </button>
      <button type="button" onClick={() => openIris({ from: "alternatives", request: { kind: "question", text: "Which 23mm?" } })}>
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
  it("reopens the panel on the conversation a sign-in left the page from, once", () => {
    // Google sign-in leaves the page and comes back to it fresh; the panel's state was only in memory.
    window.history.replaceState(null, "", "/lenses/x/browse?mount=x&iris=conv-1");
    renderProvider();

    expect(screen.getByTestId("panel")).toHaveAttribute("data-shown", "true");
    expect(screen.getByTestId("panel")).toHaveTextContent("conv-1");
    expect(window.location.search).toBe("?mount=x");
    expect(track).toHaveBeenLastCalledWith("askiris_open", { entry: "sign_in", surface: "panel", pool: undefined });
  });

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
    expect(track).toHaveBeenLastCalledWith("askiris_open", { entry: "alternatives", surface: "panel", pool: undefined });
  });

  it("opens the Ask Iris page on a narrow screen, with the question and the page it was opened from", () => {
    env.wide = false;
    window.history.replaceState(null, "", "/en/lenses/x/compare?ids=a,b");
    renderProvider();
    fireEvent.click(screen.getByRole("button", { name: "ask" }));

    expect(push).toHaveBeenCalledWith(askIrisPagePath({ question: "Which 23mm?", from: "/en/lenses/x/compare?ids=a,b" }));
    expect(screen.queryByTestId("panel")).toBeNull();
    expect(document.documentElement.style.getPropertyValue("--iris-panel-width")).toBe("0px");
    expect(track).toHaveBeenLastCalledWith("askiris_open", { entry: "alternatives", surface: "page", pool: undefined });
  });

  it("opens the Ask Iris page from the nav on a narrow screen, with nothing to hand in", () => {
    env.wide = false;
    window.history.replaceState(null, "", "/en/lenses/x/browse");
    renderProvider();
    fireEvent.click(screen.getByRole("button", { name: "nav" }));

    expect(push).toHaveBeenCalledWith(askIrisPagePath({ from: "/en/lenses/x/browse" }));
    expect(screen.queryByTestId("panel")).toBeNull();
    expect(track).toHaveBeenLastCalledWith("askiris_open", { entry: "nav", surface: "page", pool: undefined });
  });

  it("hands the panel a new opening each time the nav opens it, so the chat starts fresh", () => {
    renderProvider();
    fireEvent.click(screen.getByRole("button", { name: "nav" }));
    expect(screen.getByTestId("panel")).toHaveAttribute("data-request", "1:open");

    fireEvent.click(screen.getByRole("button", { name: "close" }));
    fireEvent.click(screen.getByRole("button", { name: "nav" }));
    expect(screen.getByTestId("panel")).toHaveAttribute("data-request", "2:open");
  });

  it("closes the panel and reports Iris hidden", () => {
    renderProvider();
    fireEvent.click(screen.getByRole("button", { name: "nav" }));
    fireEvent.click(screen.getByRole("button", { name: "close" }));

    expect(screen.getByTestId("panel")).toHaveAttribute("data-shown", "false");
    expect(screen.getByTestId("shown")).toHaveTextContent("false");
  });

  it("counts the Ask Iris page as Iris shown, and closing it goes back to the page before", () => {
    const { rerender } = render(
      <IrisPanelProvider>
        <Ask />
      </IrisPanelProvider>,
    );
    env.pathname = "/askiris";
    rerender(
      <IrisPanelProvider>
        <Ask />
      </IrisPanelProvider>,
    );
    expect(screen.getByTestId("shown")).toHaveTextContent("true");

    fireEvent.click(screen.getByRole("button", { name: "close" }));
    expect(push).toHaveBeenCalledWith("/lenses/x/browse");
  });

  it("closing the Ask Iris page without an earlier page goes home", () => {
    env.pathname = "/askiris";
    renderProvider();
    fireEvent.click(screen.getByRole("button", { name: "close" }));

    expect(push).toHaveBeenCalledWith("/");
  });
});
