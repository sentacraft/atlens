// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { SignInInteraction } from "../SignInCard";

const mocks = vi.hoisted(() => ({ session: { data: null as unknown }, openSignIn: vi.fn() }));
vi.mock("next-intl", () => ({ useTranslations: () => Object.assign((key: string) => key, { rich: (key: string) => key }) }));
vi.mock("@/lib/auth-client", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/lib/auth-client")>()), authClient: { useSession: () => mocks.session } }));
vi.mock("@/context/SignInDialogProvider", () => ({ useSignInDialog: () => mocks.openSignIn }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const guest = { user: { id: "g1", isAnonymous: true } };
const account = { user: { id: "u1", isAnonymous: false } };
const returnTo = () => "https://atlens.test/?iris=c1";

describe("shared sign-in interaction", () => {
  it.each(["gear", "favorites"] as const)("uses the existing %s sign-in flow and returns cancellation once", (reason) => {
    mocks.session = { data: guest };
    const onAnswer = vi.fn();
    render(<SignInInteraction reason={reason} outcome={null} active returnTo={returnTo} onAnswer={onAnswer} />);
    fireEvent.click(screen.getByRole("button", { name: "signIn" }));
    expect(mocks.openSignIn).toHaveBeenCalledWith(reason === "gear" ? "gear" : "iris_favorites", { returnTo: returnTo() });
    fireEvent.click(screen.getByRole("button", { name: `notNow.${reason}` }));
    fireEvent.click(screen.getByRole("button", { name: `notNow.${reason}` }));
    expect(onAnswer).toHaveBeenCalledExactlyOnceWith({ outcome: "cancelled" });
  });

  it("completes sign-in once after the real client session changes", () => {
    mocks.session = { data: guest };
    const onAnswer = vi.fn();
    const view = () => <SignInInteraction reason="gear" outcome={null} active returnTo={returnTo} onAnswer={onAnswer} />;
    const { rerender } = render(view());
    expect(onAnswer).not.toHaveBeenCalled();
    mocks.session = { data: account };
    rerender(view()); rerender(view());
    expect(onAnswer).toHaveBeenCalledExactlyOnceWith({ outcome: "signed_in" });
  });

  it("finishes a persisted pending interaction when returning already signed in", () => {
    mocks.session = { data: account };
    const onAnswer = vi.fn();
    render(<SignInInteraction reason="gear" outcome={null} active returnTo={returnTo} onAnswer={onAnswer} />);
    expect(onAnswer).toHaveBeenCalledExactlyOnceWith({ outcome: "signed_in" });
  });

  it.each(["signed_in", "cancelled"] as const)("does not resubmit a completed %s interaction after remount", (outcome) => {
    mocks.session = { data: account };
    const onAnswer = vi.fn();
    render(<SignInInteraction reason="gear" outcome={outcome} active returnTo={returnTo} onAnswer={onAnswer} />);
    expect(onAnswer).not.toHaveBeenCalled();
    expect(screen.getByText(outcome === "signed_in" ? "signedIn" : "declined")).toBeInTheDocument();
  });

  it("does not answer an old inactive card", () => {
    mocks.session = { data: account };
    const onAnswer = vi.fn();
    render(<SignInInteraction reason="gear" outcome={null} active={false} returnTo={returnTo} onAnswer={onAnswer} />);
    expect(onAnswer).not.toHaveBeenCalled();
    expect(screen.getByText("declined")).toBeInTheDocument();
  });
});
