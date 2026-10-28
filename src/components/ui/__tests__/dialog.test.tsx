// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Dialog, DialogCancel, DialogPopup, DialogTitle } from "../dialog";

const viewport = vi.hoisted(() => ({ wide: true }));
vi.mock("@/hooks/useViewport", async (importActual) => ({
  ...(await importActual<typeof import("@/hooks/useViewport")>()),
  useBreakpoint: () => viewport.wide,
}));

afterEach(() => {
  cleanup();
  viewport.wide = true;
});

function renderForm() {
  render(
    <Dialog open onOpenChange={() => {}}>
      <DialogPopup>
        <DialogTitle>Add a lens</DialogTitle>
        <DialogCancel>Cancel</DialogCancel>
      </DialogPopup>
    </Dialog>,
  );
}

describe("DialogCancel", () => {
  it("shows the Cancel in a centered dialog", () => {
    renderForm();

    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  // A Cancel beside the main action got tapped to put the keyboard away, closing the drawer.
  it("leaves the Cancel out of a drawer, which closes by swipe or the backdrop", () => {
    viewport.wide = false;
    renderForm();

    expect(screen.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
  });
});

describe("Dialog", () => {
  function renderDialog(onOpenChange: (open: boolean) => void) {
    render(
      <Dialog open onOpenChange={onOpenChange}>
        <DialogPopup>
          <DialogTitle>Sign in</DialogTitle>
        </DialogPopup>
      </Dialog>,
    );
  }

  async function pressOutside() {
    const outside = document.querySelector<HTMLElement>('[data-slot="dialog-backdrop"]')!;
    await act(async () => {
      fireEvent.pointerDown(outside, { pointerType: "mouse", button: 0 });
      fireEvent.mouseDown(outside, { button: 0 });
      fireEvent.pointerUp(outside, { pointerType: "mouse", button: 0 });
      fireEvent.mouseUp(outside, { button: 0 });
      fireEvent.click(outside, { button: 0 });
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }

  // A stray click beside a centered dialog threw away what had been typed into it.
  it("keeps a centered dialog open when the visitor presses outside it", async () => {
    const onOpenChange = vi.fn();
    renderDialog(onOpenChange);

    await pressOutside();

    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("still closes a centered dialog with Escape", async () => {
    const onOpenChange = vi.fn();
    renderDialog(onOpenChange);

    await act(async () => {
      fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    });

    expect(onOpenChange).toHaveBeenCalledWith(false, expect.anything());
  });
});
