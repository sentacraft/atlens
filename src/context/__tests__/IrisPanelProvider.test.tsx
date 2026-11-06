// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactElement, ReactNode } from "react";
import { cleanup, fireEvent, render as renderUi, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { IrisPanelProvider, useIris } from "../IrisPanelProvider";
import { track } from "@/lib/analytics/analytics";
import { askIrisChatDataQuery } from "@/lib/askiris/chat-data";

const push = vi.fn();
const env = vi.hoisted(() => ({ wide: true, pathname: "/lenses/x/browse" }));

vi.mock("@/i18n/navigation", () => ({
  usePathname: () => env.pathname,
  useRouter: () => ({ push }),
}));
vi.mock("@/hooks/useViewport", () => ({ useBreakpoint: () => env.wide }));
vi.mock("next-intl", () => ({ useLocale: () => "en" }));
vi.mock("@/lib/analytics/analytics", () => ({ track: vi.fn() }));
vi.mock("@/components/iris-panel/IrisPanel", () => ({
  default: ({
    layout,
    shown,
    request,
  }: {
    layout: string;
    shown: boolean;
    request: { id: number; kind: string; text?: string; conversationId?: string } | null;
  }) => (
    <div
      data-testid="panel"
      data-layout={layout}
      data-shown={String(shown)}
      data-request={request ? `${request.id}:${request.kind}` : ""}
    >
      {request?.text ?? request?.conversationId}
    </div>
  ),
}));

let queryClient = new QueryClient();
const Providers = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);
const render = (ui: ReactElement) => renderUi(ui, { wrapper: Providers });

afterEach(() => {
  cleanup();
  queryClient = new QueryClient();
  vi.unstubAllGlobals();
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

  it("opens a bottom sheet on a narrow screen, without making room beside the page", () => {
    env.wide = false;
    renderProvider();
    fireEvent.click(screen.getByRole("button", { name: "ask" }));

    expect(screen.getByTestId("panel")).toHaveAttribute("data-layout", "sheet");
    expect(screen.getByTestId("panel")).toHaveAttribute("data-shown", "true");
    expect(screen.getByTestId("panel")).toHaveTextContent("Which 23mm?");
    expect(document.documentElement.style.getPropertyValue("--iris-panel-width")).toBe("0px");
    expect(push).not.toHaveBeenCalled();
    expect(track).toHaveBeenLastCalledWith("askiris_open", { entry: "alternatives", surface: "sheet", pool: undefined });
  });

  it("opens the sheet from the nav on a narrow screen, as on a wide one", () => {
    env.wide = false;
    renderProvider();
    fireEvent.click(screen.getByRole("button", { name: "nav" }));

    expect(push).not.toHaveBeenCalled();
    expect(screen.getByTestId("panel")).toHaveAttribute("data-shown", "true");
    expect(screen.getByTestId("shown")).toHaveTextContent("true");
    expect(track).toHaveBeenLastCalledWith("askiris_open", { entry: "nav", surface: "sheet", pool: undefined });
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

  describe("chat data", () => {
    const key = askIrisChatDataQuery("en").queryKey;

    function idleAtOnce() {
      vi.stubGlobal("requestIdleCallback", (run: () => void) => {
        run();
        return 1;
      });
      vi.stubGlobal("cancelIdleCallback", () => {});
    }

    it("is fetched while the page is idle, before Iris is first opened", async () => {
      idleAtOnce();
      renderProvider();

      expect(screen.queryByTestId("panel")).toBeNull();
      await waitFor(() => expect(queryClient.getQueryData(key)).toMatchObject({ lenses: expect.any(Array) }));
    });

    it("is not fetched on the Ask Iris page, which has it from the server", () => {
      idleAtOnce();
      env.pathname = "/askiris";
      renderProvider();

      expect(queryClient.getQueryState(key)).toBeUndefined();
    });
  });
});
