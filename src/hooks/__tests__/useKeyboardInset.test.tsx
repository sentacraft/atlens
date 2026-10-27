// @vitest-environment jsdom
import { act, cleanup, render, renderHook, screen } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useBottomAtKeyboard, useKeyboardInset } from "../useKeyboardInset";

function stubViewport() {
  const viewport = Object.assign(new EventTarget(), { height: window.innerHeight, offsetTop: 0 });
  vi.stubGlobal("visualViewport", viewport);
  return viewport;
}

function raiseKeyboard(viewport: ReturnType<typeof stubViewport>, height: number, offsetTop = 0) {
  act(() => {
    viewport.height = window.innerHeight - height;
    viewport.offsetTop = offsetTop;
    viewport.dispatchEvent(new Event("resize"));
  });
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("useKeyboardInset", () => {
  it("reports the keyboard's height while it is up for a text field, so a one-screen layout can shrink above it", () => {
    const viewport = stubViewport();
    render(<textarea aria-label="composer" />);
    const { result } = renderHook(() => useKeyboardInset());

    act(() => screen.getByRole("textbox").focus());
    expect(result.current).toBe(0);
    raiseKeyboard(viewport, 320);
    expect(result.current).toBe(320);
    act(() => screen.getByRole("textbox").blur());
    expect(result.current).toBe(0);
  });

  it("ignores toolbars that change the visible height by less than a keyboard", () => {
    const viewport = stubViewport();
    render(<textarea aria-label="composer" />);
    const { result } = renderHook(() => useKeyboardInset());

    act(() => screen.getByRole("textbox").focus());
    raiseKeyboard(viewport, 80);
    expect(result.current).toBe(0);
  });
});

describe("useBottomAtKeyboard", () => {
  function Shell({ active }: { active: boolean }) {
    const ref = useRef<HTMLDivElement>(null);
    useBottomAtKeyboard(ref, active);
    return <div ref={ref} data-testid="shell" />;
  }

  it("scrolls back a pan that left the shrunk page short of the visible bottom", () => {
    const viewport = stubViewport();
    const scrollBy = vi.spyOn(window, "scrollBy").mockImplementation(() => {});
    render(<Shell active />);
    // The page has shrunk to end where the keyboard begins; Safari panned 200px past that.
    vi.spyOn(screen.getByTestId("shell"), "getBoundingClientRect").mockReturnValue({
      bottom: window.innerHeight - 320,
    } as DOMRect);
    raiseKeyboard(viewport, 320, 200);

    expect(scrollBy).toHaveBeenLastCalledWith(0, -200);
  });

  it("leaves the page alone while inactive", () => {
    const viewport = stubViewport();
    const scrollBy = vi.spyOn(window, "scrollBy").mockImplementation(() => {});
    render(<Shell active={false} />);
    raiseKeyboard(viewport, 320, 200);

    expect(scrollBy).not.toHaveBeenCalled();
  });
});
