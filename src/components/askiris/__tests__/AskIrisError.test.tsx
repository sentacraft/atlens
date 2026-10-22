// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/en.json";
import AskIrisError, { classifyError, RESET_AT_FORMAT } from "../AskIrisError";

const mocks = vi.hoisted(() => ({ openSignIn: vi.fn(), openSupport: vi.fn() }));

vi.mock("@/context/SignInDialogProvider", () => ({ useSignInDialog: () => mocks.openSignIn }));
vi.mock("@/context/SupportDialogProvider", () => ({ useSupportDialog: () => mocks.openSupport }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const RESET_AT = Date.UTC(2026, 9, 23);
const localResetAt = new Intl.DateTimeFormat("en", RESET_AT_FORMAT).format(RESET_AT);

function renderError(body: object) {
  const error = classifyError(new Error(JSON.stringify(body)));
  render(
    <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
      <AskIrisError error={error} onRetry={() => {}} />
    </NextIntlClientProvider>,
  );
  return screen.getByRole("alert");
}

describe("AskIrisError", () => {
  it("offers a guest who used today's questions a sign-in", () => {
    const alert = renderError({ kind: "guest_quota", resetAt: RESET_AT });

    expect(alert).toHaveTextContent("You've used today's 3 free questions");
    expect(alert).toHaveTextContent("to ask more each day");
    expect(alert).not.toHaveTextContent("20");
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(mocks.openSignIn).toHaveBeenCalledWith("iris_quota");
  });

  it("tells an account when its questions come back", () => {
    expect(renderError({ kind: "account_quota", resetAt: RESET_AT })).toHaveTextContent(
      `You've used today's questions. You can ask again from ${localResetAt}.`,
    );
  });

  it("does not tell a visitor to try again shortly when the overall limit is reached", () => {
    const alert = renderError({ kind: "budget", resetAt: RESET_AT });

    expect(alert).toHaveTextContent(`will be back on ${localResetAt}`);
    expect(alert).not.toHaveTextContent(messages.AskIris.rateLimited);
  });

  it("keeps a guest's way forward to signing in, without asking for support", () => {
    renderError({ kind: "guest_quota", resetAt: RESET_AT });

    expect(screen.queryByRole("button", { name: messages.AskIris.limitSupport })).toBeNull();
  });

  it("asks for support when an account or the whole site has run out", () => {
    renderError({ kind: "account_quota", resetAt: RESET_AT });
    fireEvent.click(screen.getByRole("button", { name: messages.AskIris.limitSupport }));
    expect(mocks.openSupport).toHaveBeenCalledWith("iris_limit");

    cleanup();
    renderError({ kind: "budget", resetAt: RESET_AT });
    expect(screen.getByRole("button", { name: messages.AskIris.limitSupport })).toBeInTheDocument();
  });
});
