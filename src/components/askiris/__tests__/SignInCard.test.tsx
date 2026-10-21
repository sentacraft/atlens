// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { SignInGate } from "../SignInCard";

const mocks = vi.hoisted(() => ({
  session: { data: null as unknown },
  openSignIn: vi.fn(),
}));

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("@/lib/auth-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth-client")>()),
  authClient: { useSession: () => mocks.session },
}));
vi.mock("@/context/SignInDialogProvider", () => ({ useSignInDialog: () => mocks.openSignIn }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const guest = { user: { id: "g1", isAnonymous: true } };
const account = { user: { id: "u1", isAnonymous: false } };
const returnTo = () => "https://atlens.test/?iris=c1";

describe("SignInGate", () => {
  it("asks a guest to sign in for the call's reason, or lets them go on without it", () => {
    mocks.session = { data: guest };
    const onAnswer = vi.fn();
    render(<SignInGate reason="favorites" active returnTo={returnTo} onAnswer={onAnswer} />);

    // The card leads with why, in Iris's voice, whether or not the reply said anything before it.
    expect(screen.getByText("leadIn.favorites")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "signIn" }));
    // Google sign-in leaves the page; it has to come back to this conversation to carry on.
    expect(mocks.openSignIn).toHaveBeenCalledWith("iris_favorites", { returnTo: "https://atlens.test/?iris=c1" });

    fireEvent.click(screen.getByRole("button", { name: "notNow.favorites" }));
    expect(onAnswer).toHaveBeenCalledWith(false);
  });

  it("lets the paused call run once the user has signed in, exactly once", () => {
    mocks.session = { data: guest };
    const onAnswer = vi.fn();
    const { rerender } = render(<SignInGate reason="favorites" active returnTo={returnTo} onAnswer={onAnswer} />);
    expect(onAnswer).not.toHaveBeenCalled();

    mocks.session = { data: account };
    rerender(<SignInGate reason="favorites" active returnTo={returnTo} onAnswer={onAnswer} />);
    rerender(<SignInGate reason="favorites" active returnTo={returnTo} onAnswer={onAnswer} />);

    expect(onAnswer).toHaveBeenCalledTimes(1);
    expect(onAnswer).toHaveBeenCalledWith(true);
  });

  it("leaves a line where the card was once the user signed in", () => {
    mocks.session = { data: account };
    render(<SignInGate reason="favorites" answered active={false} returnTo={returnTo} onAnswer={vi.fn()} />);

    expect(screen.getByText("signedIn")).toBeInTheDocument();
    expect(screen.queryByText("leadIn.favorites")).toBeNull();
  });

  it("leaves a line, not a card, once the user declined or moved on", () => {
    mocks.session = { data: account };
    const onAnswer = vi.fn();
    render(<SignInGate reason="favorites" active={false} returnTo={returnTo} onAnswer={onAnswer} />);

    expect(screen.getByText("declined")).toBeInTheDocument();
    expect(onAnswer).not.toHaveBeenCalled();
  });
});
