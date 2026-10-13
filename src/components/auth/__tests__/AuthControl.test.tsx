// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import AuthControl from "../AuthControl";

const session = vi.hoisted(() => ({ current: { data: null as unknown } }));
const deleteUser = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth-client")>()),
  authClient: { useSession: () => session.current, signOut: vi.fn(), deleteUser },
}));
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key, useLocale: () => "zh" }));
vi.mock("@/context/TestHookProvider", () => ({ useTestHookEnabled: () => true }));

afterEach(cleanup);

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

    await waitFor(() => expect(screen.getByText("deleteEmailSent")).toBeInTheDocument());
    expect(deleteUser).toHaveBeenCalledWith({ callbackURL: "/zh" });
    expect(screen.queryByRole("button", { name: "deleteEmailSend" })).toBeNull();
  });
});
