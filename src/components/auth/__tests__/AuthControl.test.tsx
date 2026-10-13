// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import AuthControl from "../AuthControl";

const session = vi.hoisted(() => ({ current: { data: null as unknown } }));
const deleteUser = vi.hoisted(() => vi.fn());
const sendVerificationOtp = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth-client")>()),
  authClient: {
    useSession: () => session.current,
    signOut: vi.fn(),
    deleteUser,
    emailOtp: { sendVerificationOtp },
  },
}));
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key} ${JSON.stringify(values)}` : key,
  useLocale: () => "zh",
}));
vi.mock("@/context/TestHookProvider", () => ({ useTestHookEnabled: () => true }));

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
});

function user(isAnonymous: boolean) {
  return { user: { id: "u1", name: "Iris", email: "iris@example.test", isAnonymous } };
}

describe("AuthControl", () => {
  it("offers sign-in to an anonymous user", () => {
    session.current = { data: user(true) };

    render(<AuthControl />);

    expect(screen.getByRole("button", { name: "login" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "accountLabel" })).toBeNull();
  });

  it("shows the account menu to a signed-in user", () => {
    session.current = { data: user(false) };

    render(<AuthControl />);

    expect(screen.queryByRole("button", { name: "login" })).toBeNull();
  });

  it("emails a confirmation link instead of deleting at once", async () => {
    session.current = { data: user(false) };
    deleteUser.mockResolvedValue({ error: null });

    render(<AuthControl />);
    fireEvent.click(screen.getByRole("button", { name: "accountLabel" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "deleteAccount" }));
    fireEvent.click(await screen.findByRole("button", { name: "deleteEmailSend" }));

    await waitFor(() => expect(screen.getByText(/^deleteEmailSent/)).toBeInTheDocument());
    expect(deleteUser).toHaveBeenCalledWith({ callbackURL: "/zh" });
    expect(screen.queryByRole("button", { name: "deleteEmailSend" })).toBeNull();
  });

  it("lets the user resend the code once the cooldown ends", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    session.current = { data: user(true) };
    sendVerificationOtp.mockResolvedValue({ error: null });

    render(<AuthControl />);
    fireEvent.click(screen.getByRole("button", { name: "login" }));
    fireEvent.change(await screen.findByLabelText("emailLabel"), {
      target: { value: "iris@example.test" },
    });
    fireEvent.click(screen.getByRole("button", { name: "sendCode" }));

    const resend = await screen.findByRole("button", { name: /^resendIn/ });
    expect(resend).toBeDisabled();
    expect(resend).toHaveTextContent('resendIn {"seconds":60}');

    await act(() => vi.advanceTimersByTimeAsync(60_000));
    fireEvent.click(screen.getByRole("button", { name: "resendCode" }));

    await waitFor(() => expect(sendVerificationOtp).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole("button", { name: /^resendIn/ })).toBeDisabled();
  });

  it("explains a rate-limited request in the UI language", async () => {
    session.current = { data: user(true) };
    sendVerificationOtp.mockResolvedValue({
      error: { status: 429, message: "Too many requests. Please try again later." },
    });

    render(<AuthControl />);
    fireEvent.click(screen.getByRole("button", { name: "login" }));
    fireEvent.change(await screen.findByLabelText("emailLabel"), {
      target: { value: "iris@example.test" },
    });
    fireEvent.click(screen.getByRole("button", { name: "sendCode" }));

    expect(await screen.findByText("tooManyRequests")).toBeInTheDocument();
  });
});
