// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import AuthControl from "../AuthControl";

const session = vi.hoisted(() => ({ current: { data: null as unknown } }));
const sendVerificationOtp = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth-client")>()),
  authClient: {
    useSession: () => session.current,
    signOut: vi.fn(),
    emailOtp: { sendVerificationOtp },
  },
}));
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key} ${JSON.stringify(values)}` : key,
  useLocale: () => "zh",
}));
vi.mock("@/context/TestHookProvider", () => ({ useTestHookEnabled: () => true }));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, ...props }: { href: string }) => <a href={href} {...props} />,
}));

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
});

function user(isAnonymous: boolean, image: string | null = null) {
  return { user: { id: "u1", name: "Iris", email: "iris@example.test", isAnonymous, image } };
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

  it("links the account menu to the profile page and no longer offers deletion", async () => {
    session.current = { data: user(false) };

    render(<AuthControl />);
    fireEvent.click(screen.getByRole("button", { name: "accountLabel" }));

    expect(await screen.findByRole("menuitem", { name: "profile" })).toHaveAttribute("href", "/me");
    expect(screen.queryByRole("menuitem", { name: "deleteAccount" })).toBeNull();
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

  it("shows the account's picture in the menu button", () => {
    session.current = { data: user(false, "https://lh3.googleusercontent.com/a/photo") };

    const { container } = render(<AuthControl />);

    const img = container.querySelector("img");
    expect(img).toHaveAttribute("src", "https://lh3.googleusercontent.com/a/photo");
    expect(img).toHaveAttribute("referrerpolicy", "no-referrer");
  });

  it("falls back to initials when the picture is missing or fails to load", () => {
    session.current = { data: user(false, "https://lh3.googleusercontent.com/a/broken") };

    const { container } = render(<AuthControl />);
    fireEvent.error(container.querySelector("img")!);

    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByRole("button", { name: "accountLabel" })).toHaveTextContent("I");
  });
});
