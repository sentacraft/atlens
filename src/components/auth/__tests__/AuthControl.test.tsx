// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import AuthControl from "../AuthControl";

const session = vi.hoisted(() => ({ current: { data: null as unknown } }));

vi.mock("@/lib/auth-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth-client")>()),
  authClient: { useSession: () => session.current, signOut: vi.fn(), deleteUser: vi.fn() },
}));
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
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
});
