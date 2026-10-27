// @vitest-environment jsdom
import { act, cleanup, render, renderHook, screen } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useFitAboveKeyboard, useKeyboardViewport } from "../useKeyboardViewport";

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

describe("useKeyboardViewport", () => {
  it("reports the visible height while the keyboard is up for a text field, so a one-screen layout can fit above it", () => {
    const viewport = stubViewport();
    render(<textarea aria-label="composer" />);
    const { result } = renderHook(() => useKeyboardViewport());

    act(() => screen.getByRole("textbox").focus());
    expect(result.current).toBeNull();
    raiseKeyboard(viewport, 320);
    expect(result.current).toBe(window.innerHeight - 320);
    act(() => screen.getByRole("textbox").blur());
    expect(result.current).toBeNull();
  });

  it("ignores toolbars that change the visible height by less than a keyboard", () => {
    const viewport = stubViewport();
    render(<textarea aria-label="composer" />);
    const { result } = renderHook(() => useKeyboardViewport());

    act(() => screen.getByRole("textbox").focus());
    raiseKeyboard(viewport, 80);
    expect(result.current).toBeNull();
  });
});

describe("useFitAboveKeyboard", () => {
  function Shell({ active }: { active: boolean }) {
    const ref = useRef<HTMLDivElement>(null);
    useFitAboveKeyboard(ref, active);
    return (
      <>
        <textarea aria-label="composer" />
        <div ref={ref} data-testid="shell" />
      </>
    );
  }

  it("scrolls back a pan that left the shrunk page short of the visible bottom", () => {
    const viewport = stubViewport();
    const scrollBy = vi.spyOn(window, "scrollBy").mockImplementation(() => {});
    render(<Shell active />);
    act(() => screen.getByRole("textbox").focus());
    // The page fits above the keyboard; Safari panned 200px past that.
    vi.spyOn(screen.getByTestId("shell"), "getBoundingClientRect").mockReturnValue({
      bottom: window.innerHeight - 320,
    } as DOMRect);
    raiseKeyboard(viewport, 320, 200);
    act(() => viewport.dispatchEvent(new Event("scroll")));

    expect(scrollBy).toHaveBeenLastCalledWith(0, -200);
  });

  it("leaves the page alone while inactive", () => {
    const viewport = stubViewport();
    const scrollBy = vi.spyOn(window, "scrollBy").mockImplementation(() => {});
    render(<Shell active={false} />);
    act(() => screen.getByRole("textbox").focus());
    raiseKeyboard(viewport, 320, 200);
    act(() => viewport.dispatchEvent(new Event("scroll")));

    expect(scrollBy).not.toHaveBeenCalled();
  });
});
