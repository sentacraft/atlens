// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import TabBar from "../TabBar";

const env = vi.hoisted(() => ({ pathname: "/lenses/x/browse", irisShown: false }));
const track = vi.hoisted(() => vi.fn());
const openIris = vi.hoisted(() => vi.fn());
const closeIris = vi.hoisted(() => vi.fn());

vi.mock("@/lib/analytics/analytics", () => ({ track }));
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, ...props }: { href: string }) => <a href={href} {...props} />,
  usePathname: () => env.pathname,
}));
vi.mock("@/hooks/useMountParam", () => ({ useEffectiveMount: () => "X" }));
vi.mock("@/context/IrisPanelProvider", () => ({
  useIris: () => ({ openIris, closeIris, irisShown: env.irisShown }),
}));
vi.mock("@/components/iris/Iris", () => ({ default: () => <span /> }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  env.pathname = "/lenses/x/browse";
  env.irisShown = false;
});

describe("TabBar", () => {
  it("links the lens library, charts and profile, and marks the current section", () => {
    env.pathname = "/lenses/x/charts/weight";
    render(<TabBar />);

    expect(screen.getByRole("link", { name: "lenses" })).toHaveAttribute("href", "/lenses/x/browse");
    expect(screen.getByRole("link", { name: "charts" })).toHaveAttribute("href", "/lenses/x/charts");
    expect(screen.getByRole("link", { name: "me" })).toHaveAttribute("href", "/me");
    expect(screen.getByRole("link", { name: "charts" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "lenses" })).not.toHaveAttribute("aria-current");
  });

  it("opens Iris from the tab bar and records where the click came from", () => {
    render(<TabBar />);
    fireEvent.click(screen.getByRole("button", { name: /askIris/ }));

    expect(openIris).toHaveBeenCalledWith({ from: "tab_bar" });
    expect(track).toHaveBeenCalledWith("nav_click", { item: "iris", place: "tab_bar" });
  });

  it("names the Iris button as the header does, with its AI tag after the label", () => {
    render(<TabBar />);

    expect(screen.getByRole("button")).toHaveAccessibleName(/^askIris/);
  });

  it("closes Iris when it is already open", () => {
    env.irisShown = true;
    render(<TabBar />);
    fireEvent.click(screen.getByRole("button", { name: /askIris/ }));

    expect(closeIris).toHaveBeenCalled();
    expect(openIris).not.toHaveBeenCalled();
  });
});
