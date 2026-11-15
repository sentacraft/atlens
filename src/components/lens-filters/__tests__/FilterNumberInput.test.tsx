// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import FilterNumberInput from "../FilterNumberInput";

afterEach(cleanup);

function setup(value: number | null = null) {
  const onCommit = vi.fn();
  render(<FilterNumberInput label="Focal length" value={value} unit="mm" placeholder="40" invalidLabel="Positive number required" onCommit={onCommit} />);
  return { input: screen.getByRole("textbox", { name: "Focal length" }), onCommit };
}

describe("FilterNumberInput", () => {
  it("keeps editing drafts local until blur", () => {
    const { input, onCommit } = setup();
    fireEvent.change(input, { target: { value: "40.5" } });
    expect(onCommit).not.toHaveBeenCalled();
    fireEvent.blur(input);
    expect(onCommit).toHaveBeenCalledExactlyOnceWith(40.5);
  });

  it("does not round an unchanged converted value back into state", () => {
    const { input, onCommit } = setup(40 / 1.5);
    fireEvent.focus(input);
    fireEvent.blur(input);
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("does not apply invalid text and clears a committed value with an empty draft", () => {
    const { input, onCommit } = setup(40);
    fireEvent.change(input, { target: { value: "-2" } });
    fireEvent.blur(input);
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(onCommit).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.blur(input);
    expect(onCommit).toHaveBeenCalledExactlyOnceWith(null);
  });

  it("Escape discards an edit without reviving it on blur", () => {
    const { input, onCommit } = setup(40);
    fireEvent.change(input, { target: { value: "55" } });
    fireEvent.keyDown(input, { key: "Escape" });
    fireEvent.blur(input);
    expect((input as HTMLInputElement).value).toBe("40");
    expect(onCommit).not.toHaveBeenCalled();
  });
});
