// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import KeyboardInsets from "../KeyboardInsets";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("KeyboardInsets", () => {
  it("marks the page and hands it the height above the keyboard while one is up", () => {
    const viewport = Object.assign(new EventTarget(), { height: window.innerHeight });
    vi.stubGlobal("visualViewport", viewport);
    render(
      <>
        <textarea aria-label="composer" />
        <KeyboardInsets />
      </>,
    );
    const root = document.documentElement;

    act(() => screen.getByRole("textbox").focus());
    expect(root).not.toHaveAttribute("data-keyboard");
    act(() => {
      viewport.height = window.innerHeight - 300;
      viewport.dispatchEvent(new Event("resize"));
    });
    expect(root).toHaveAttribute("data-keyboard");
    expect(root.style.getPropertyValue("--keyboard-visible-height")).toBe(`${window.innerHeight - 300}px`);

    act(() => screen.getByRole("textbox").blur());
    expect(root).not.toHaveAttribute("data-keyboard");
    expect(root.style.getPropertyValue("--keyboard-visible-height")).toBe("");
  });
});
