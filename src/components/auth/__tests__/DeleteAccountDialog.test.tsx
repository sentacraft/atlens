// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import DeleteAccountDialog from "../DeleteAccountDialog";

const deleteUser = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth-client", () => ({ authClient: { deleteUser } }));
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key} ${JSON.stringify(values)}` : key,
  useLocale: () => "zh",
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("DeleteAccountDialog", () => {
  it("emails a confirmation link instead of deleting at once", async () => {
    deleteUser.mockResolvedValue({ error: null });

    render(<DeleteAccountDialog email="iris@example.test" open onOpenChange={() => {}} />);
    fireEvent.click(await screen.findByRole("button", { name: "deleteEmailSend" }));

    await waitFor(() => expect(screen.getByText(/^deleteEmailSent/)).toBeInTheDocument());
    expect(deleteUser).toHaveBeenCalledWith({ callbackURL: "/zh" });
    expect(screen.queryByRole("button", { name: "deleteEmailSend" })).toBeNull();
  });

  it("shows an error and keeps the send button when the request fails", async () => {
    deleteUser.mockResolvedValue({ error: { status: 500 } });

    render(<DeleteAccountDialog email="iris@example.test" open onOpenChange={() => {}} />);
    fireEvent.click(await screen.findByRole("button", { name: "deleteEmailSend" }));

    expect(await screen.findByText("genericError")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "deleteEmailSend" })).toBeInTheDocument();
  });
});
