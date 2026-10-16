// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import HomeHeroActions from "../HomeHeroActions";

const push = vi.fn();
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
  useRouter: () => ({ push }),
}));
vi.mock("@/hooks/useMountParam", () => ({ useEffectiveMount: () => "X" }));
vi.mock("@/hooks/useViewport", () => ({ useBreakpoint: () => wide.value }));

afterEach(() => {
  cleanup();
  push.mockClear();
  wide.value = true;
});

describe("HomeHeroActions", () => {
  it("opens Ask Iris in place, and Escape closes it", () => {
    render(<HomeHeroActions />);
    fireEvent.click(screen.getByRole("button", { name: /askIris/ }));
    expect(screen.getByPlaceholderText("irisPlaceholder")).toHaveFocus();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByPlaceholderText("irisPlaceholder")).toBeNull();
  });

  it("hands an example over to Ask Iris as the first message", () => {
    render(<HomeHeroActions />);
    fireEvent.click(screen.getByRole("button", { name: /askIris/ }));
    fireEvent.click(screen.getByRole("button", { name: "A pancake lens that fits in a pocket" }));

    expect(push).toHaveBeenCalledWith("/askiris?q=A+pancake+lens+that+fits+in+a+pocket");
  });

  it("links straight to Ask Iris on a phone", () => {
    wide.value = false;
    render(<HomeHeroActions />);

    expect(screen.getByRole("link", { name: /askIris/ })).toHaveAttribute("href", "/askiris");
  });
});
