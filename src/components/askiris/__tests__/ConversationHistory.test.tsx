// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import ConversationHistory from "../ConversationHistory";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key} ${Object.values(values).join(",")}` : key,
  useLocale: () => "en",
}));

afterEach(cleanup);

const conversations = [
  { id: "c1", title: "Street lens under 3000", createdAt: 1, updatedAt: 1_760_000_000_000 },
  { id: "c2", title: "Portrait for X-T5", createdAt: 1, updatedAt: 1_760_000_000_000 },
];

function renderHistory({ list = conversations, onSignIn = null }: { list?: typeof conversations; onSignIn?: (() => void) | null } = {}) {
  const onRename = vi.fn();
  const onDelete = vi.fn();
  render(
    <ConversationHistory
      open
      onOpenChange={() => {}}
      conversations={list}
      listState="ready"
      activeConversationId="c1"
      onSelect={() => {}}
      onNew={() => {}}
      onRename={onRename}
      onDelete={onDelete}
      onSignIn={onSignIn}
    />,
  );
  return { onRename, onDelete };
}

async function openActions(title: string) {
  fireEvent.click(await screen.findByRole("button", { name: `conversationActions ${title}` }));
}

describe("ConversationHistory", () => {
  it("offers a visitor without an account to sign in, with what an account adds", async () => {
    const onSignIn = vi.fn();
    renderHistory({ list: [], onSignIn });
    for (const benefit of ["historySignInKeep", "historySignInGear", "historySignInFavorites"]) {
      expect(await screen.findByText(benefit)).toBeInTheDocument();
    }
    fireEvent.click(screen.getByRole("button", { name: "historySignIn" }));
    expect(onSignIn).toHaveBeenCalled();
  });

  it("shows no sign-in card to an account", async () => {
    renderHistory();
    await screen.findByText("Street lens under 3000");
    expect(screen.queryByRole("button", { name: "historySignIn" })).toBeNull();
  });

  it("renames a conversation in place", async () => {
    const { onRename } = renderHistory();

    await openActions("Portrait for X-T5");
    fireEvent.click(await screen.findByRole("menuitem", { name: "renameConversation" }));
    const input = screen.getByRole("textbox", { name: "conversationTitleLabel" });
    fireEvent.change(input, { target: { value: "  56mm or 33mm  " } });
    fireEvent.submit(input);

    expect(onRename).toHaveBeenCalledExactlyOnceWith("c2", "56mm or 33mm");
  });

  it("keeps the title when the edit is cancelled or left unchanged", async () => {
    const { onRename } = renderHistory();

    await openActions("Portrait for X-T5");
    fireEvent.click(await screen.findByRole("menuitem", { name: "renameConversation" }));
    fireEvent.keyDown(screen.getByRole("textbox", { name: "conversationTitleLabel" }), { key: "Escape" });

    expect(onRename).not.toHaveBeenCalled();
    expect(screen.getByText("Portrait for X-T5")).toBeInTheDocument();
  });

  it("deletes a conversation only after confirming", async () => {
    const { onDelete } = renderHistory();

    await openActions("Street lens under 3000");
    fireEvent.click(await screen.findByRole("menuitem", { name: "deleteConversation" }));
    expect(onDelete).not.toHaveBeenCalled();
    expect(await screen.findByText("deleteConversationBody Street lens under 3000")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "deleteConversation" }));

    expect(onDelete).toHaveBeenCalledExactlyOnceWith("c1");
  });
});
