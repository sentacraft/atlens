// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
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
