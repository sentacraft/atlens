// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { SignInGate } from "../SignInCard";

const mocks = vi.hoisted(() => ({ session: { data: null as unknown }, openSignIn: vi.fn() }));
vi.mock("next-intl", () => ({ useTranslations: () => Object.assign((key: string) => key, { rich: (key: string) => key }) }));
vi.mock("@/lib/auth-client", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/lib/auth-client")>()), authClient: { useSession: () => mocks.session } }));
vi.mock("@/context/SignInDialogProvider", () => ({ useSignInDialog: () => mocks.openSignIn }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const guest = { user: { id: "g1", isAnonymous: true } };
const account = { user: { id: "u1", isAnonymous: false } };
const returnTo = () => "https://atlens.test/?iris=c1";

describe("shared sign-in approval", () => {
  it.each(["gear", "favorites"] as const)("uses the existing %s sign-in flow and returns cancellation once", (reason) => {
    mocks.session = { data: guest };
    const onAnswer = vi.fn();
    render(<SignInGate reason={reason} active returnTo={returnTo} onAnswer={onAnswer} />);
    fireEvent.click(screen.getByRole("button", { name: "signIn" }));
    expect(mocks.openSignIn).toHaveBeenCalledWith(reason === "gear" ? "gear" : "iris_favorites", { returnTo: returnTo() });
    fireEvent.click(screen.getByRole("button", { name: `notNow.${reason}` }));
    fireEvent.click(screen.getByRole("button", { name: `notNow.${reason}` }));
    expect(onAnswer).toHaveBeenCalledExactlyOnceWith(false);
  });

  it.each(["gear", "favorites"] as const)("completes %s once after the real client session changes", (reason) => {
    mocks.session = { data: guest };
    const onAnswer = vi.fn();
    const view = () => <SignInGate reason={reason} active returnTo={returnTo} onAnswer={onAnswer} />;
    const { rerender } = render(view());
    expect(onAnswer).not.toHaveBeenCalled();
    mocks.session = { data: account };
    rerender(view()); rerender(view());
    expect(onAnswer).toHaveBeenCalledExactlyOnceWith(true);
  });

  it("does not replace cancellation when the client signs in before the parent updates", () => {
    mocks.session = { data: guest };
    const onAnswer = vi.fn();
    const view = () => <SignInGate reason="gear" active returnTo={returnTo} onAnswer={onAnswer} />;
    const { rerender } = render(view());
    fireEvent.click(screen.getByRole("button", { name: "notNow.gear" }));
    mocks.session = { data: account };
    rerender(view());
    expect(onAnswer).toHaveBeenCalledExactlyOnceWith(false);
  });

  it("finishes a persisted pending approval when returning already signed in", () => {
    mocks.session = { data: account };
    const onAnswer = vi.fn();
    render(<SignInGate reason="gear" active returnTo={returnTo} onAnswer={onAnswer} />);
    expect(onAnswer).toHaveBeenCalledExactlyOnceWith(true);
  });

  it.each([true, false])("does not resubmit a completed %s approval after remount", (answered) => {
    mocks.session = { data: account };
    const onAnswer = vi.fn();
    const view = () => <SignInGate reason="gear" answered={answered} active returnTo={returnTo} onAnswer={onAnswer} />;
    const first = render(view());
    first.unmount();
    render(view());
    expect(onAnswer).not.toHaveBeenCalled();
    expect(screen.getByText(answered ? "signedIn" : "declined")).toBeInTheDocument();
  });

  it("does not answer an old inactive card", () => {
    mocks.session = { data: account };
    const onAnswer = vi.fn();
    render(<SignInGate reason="gear" active={false} returnTo={returnTo} onAnswer={onAnswer} />);
    expect(onAnswer).not.toHaveBeenCalled();
    expect(screen.getByText("declined")).toBeInTheDocument();
  });
});
