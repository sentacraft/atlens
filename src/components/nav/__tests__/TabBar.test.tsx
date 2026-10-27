// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import TabBar from "../TabBar";

const env = vi.hoisted(() => ({ pathname: "/lenses/x/browse" }));
const track = vi.hoisted(() => vi.fn());
const openIris = vi.hoisted(() => vi.fn());

vi.mock("@/lib/analytics/analytics", () => ({ track }));
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, ...props }: { href: string }) => <a href={href} {...props} />,
  usePathname: () => env.pathname,
}));
vi.mock("@/hooks/useMountParam", () => ({ useEffectiveMount: () => "X" }));
vi.mock("@/components/iris/Iris", () => ({ default: () => <span /> }));
vi.mock("@/context/IrisPanelProvider", () => ({
  useIris: () => ({ openIris }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  env.pathname = "/lenses/x/browse";
});

describe("TabBar", () => {
  it("links the four sections and marks the current one", () => {
    env.pathname = "/lenses/x/charts/weight";
    render(<TabBar />);

    expect(screen.getByRole("link", { name: "lenses" })).toHaveAttribute("href", "/lenses/x/browse");
    expect(screen.getByRole("link", { name: "charts" })).toHaveAttribute("href", "/lenses/x/charts");
    expect(screen.getByRole("link", { name: /^askIris/ })).toHaveAttribute("href", "/askiris");
    expect(screen.getByRole("link", { name: "me" })).toHaveAttribute("href", "/me");
    expect(screen.getByRole("link", { name: "charts" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "lenses" })).not.toHaveAttribute("aria-current");
  });

  it("opens Iris through openIris, which hands the Ask Iris page the page left behind", () => {
    render(<TabBar />);
    const followed = fireEvent.click(screen.getByRole("link", { name: /^askIris/ }));

    expect(followed).toBe(false);
    expect(openIris).toHaveBeenCalledWith({ from: "tab_bar" });
    expect(track).toHaveBeenCalledWith("nav_click", { item: "iris", place: "tab_bar" });
  });

  it("marks Ask Iris on the Ask Iris page, where tapping it again does nothing", () => {
    env.pathname = "/askiris";
    render(<TabBar />);
    fireEvent.click(screen.getByRole("link", { name: /^askIris/ }));

    expect(screen.getByRole("link", { name: /^askIris/ })).toHaveAttribute("aria-current", "page");
    expect(openIris).not.toHaveBeenCalled();
  });

  it("steps aside while the keyboard is up for a text field, so it is not lifted over the field", () => {
    const viewport = Object.assign(new EventTarget(), { height: window.innerHeight });
    vi.stubGlobal("visualViewport", viewport);
    render(
      <>
        <textarea aria-label="composer" />
        <input type="checkbox" aria-label="option" />
        <TabBar />
      </>,
    );
    const tabBar = () => screen.queryByRole("navigation", { name: "tabBar" });

    act(() => screen.getByRole("checkbox", { name: "option" }).focus());
    expect(tabBar()).not.toBeNull();
    // Focused but no keyboard yet, as with an autofocused field.
    act(() => screen.getByRole("textbox", { name: "composer" }).focus());
    expect(tabBar()).not.toBeNull();
    act(() => {
      viewport.height = window.innerHeight - 300;
      viewport.dispatchEvent(new Event("resize"));
    });
    expect(tabBar()).toBeNull();
    act(() => screen.getByRole("textbox", { name: "composer" }).blur());
    expect(tabBar()).not.toBeNull();
    vi.unstubAllGlobals();
  });

  it("names Ask Iris as the header does, with its AI tag after the label", () => {
    render(<TabBar />);

    expect(screen.getByRole("link", { name: /^askIris/ })).toHaveAccessibleName(/^askIris/);
  });
});
