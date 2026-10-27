// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import AskIrisComposer from "../AskIrisComposer";

afterEach(cleanup);

function renderComposer(props: Partial<Parameters<typeof AskIrisComposer>[0]> = {}) {
  const handlers = { onSubmit: vi.fn(), onStop: vi.fn() };
  render(
    <AskIrisComposer
      value="Which lens?"
      onChange={() => {}}
      placeholder="Ask"
      sendLabel="Send"
      stopLabel="Stop"
      {...handlers}
      {...props}
    />,
  );
  return handlers;
}

describe("AskIrisComposer", () => {
  it("sends when idle", () => {
    const { onSubmit, onStop } = renderComposer();

    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(onSubmit).toHaveBeenCalledOnce();
    expect(onStop).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Stop" })).toBeNull();
  });

  it("turns the send button into stop while a reply streams", () => {
    const { onSubmit, onStop } = renderComposer({ streaming: true, disabled: true });

    const stop = screen.getByRole("button", { name: "Stop" });
    expect(stop).toBeEnabled();
    fireEvent.click(stop);

    expect(onStop).toHaveBeenCalledOnce();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Send" })).toBeNull();
  });

  it("does not submit the form on Enter while streaming", () => {
    const { onSubmit } = renderComposer({ streaming: true, disabled: true });

    fireEvent.submit(screen.getByRole("textbox").closest("form")!);

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("sends on Enter and breaks the line on Shift+Enter", () => {
    const { onSubmit } = renderComposer();
    const field = screen.getByRole("textbox");

    fireEvent.keyDown(field, { key: "Enter", shiftKey: true });
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.keyDown(field, { key: "Enter" });
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it("does not send on the Enter that confirms an IME composition", () => {
    const { onSubmit } = renderComposer();

    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter", isComposing: true });

    expect(onSubmit).not.toHaveBeenCalled();
  });
});
