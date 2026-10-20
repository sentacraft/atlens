// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { SignInDialogProvider, useSignInDialog, type SignInSource } from "../SignInDialogProvider";
import { track } from "@/lib/analytics/analytics";

vi.mock("@/lib/analytics/analytics", () => ({ track: vi.fn() }));
vi.mock("@/components/auth/AuthDialog", () => ({
  default: ({ open, reason }: { open: boolean; reason?: string }) => (
    <div data-testid="dialog" data-open={String(open)} data-reason={reason ?? ""} />
  ),
}));

afterEach(() => {
  cleanup();
  vi.mocked(track).mockClear();
});

function Opener({ source }: { source: SignInSource }) {
  const openSignIn = useSignInDialog();
  return (
    <button type="button" onClick={() => openSignIn(source)}>
      open
    </button>
  );
}

function open(source: SignInSource) {
  render(
    <SignInDialogProvider>
      <Opener source={source} />
    </SignInDialogProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "open" }));
  return screen.getByTestId("dialog");
}

describe("SignInDialogProvider", () => {
  it("records a plain sign-in button as general, with where it sits", () => {
    const dialog = open("account_menu");

    expect(track).toHaveBeenCalledWith("sign_in_open", { reason: "general", entry: "account_menu" });
    expect(dialog.dataset).toMatchObject({ open: "true", reason: "" });
  });

  it("records an action as the reason and titles the dialog for it", () => {
    const dialog = open("favorite");

    expect(track).toHaveBeenCalledWith("sign_in_open", { reason: "favorite" });
    expect(dialog.dataset.reason).toBe("favorite");
  });
});
