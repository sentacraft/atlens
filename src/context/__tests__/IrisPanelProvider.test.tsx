// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { IrisPanelProvider, useOpenIris } from "../IrisPanelProvider";

const push = vi.fn();
const env = vi.hoisted(() => ({ wide: true, pathname: "/lenses/x/browse" }));

vi.mock("@/i18n/navigation", () => ({
  usePathname: () => env.pathname,
  useRouter: () => ({ push }),
}));
vi.mock("@/hooks/useViewport", () => ({ useBreakpoint: () => env.wide }));
vi.mock("@/components/iris-panel/IrisPanel", () => ({
  default: ({ shown, request }: { shown: boolean; request: { question: { text: string } } | null }) => (
    <div data-testid="panel" data-shown={String(shown)}>
      {request?.question.text}
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
    <button type="button" onClick={() => openIris({ text: "Which 23mm?", mode: "draft" })}>
      ask
    </button>
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
  });

  it("goes to the Ask Iris page on a narrow screen, carrying the page the question is about", () => {
    env.wide = false;
    window.history.replaceState(null, "", "/en/lenses/x/compare?ids=a,b");
    render(
      <IrisPanelProvider>
        <Ask />
      </IrisPanelProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "ask" }));

    expect(push).toHaveBeenCalledWith(
      "/askiris?draft=Which+23mm%3F&from=%2Fen%2Flenses%2Fx%2Fcompare%3Fids%3Da%2Cb",
    );
    expect(screen.queryByTestId("panel")).toBeNull();
  });
});
