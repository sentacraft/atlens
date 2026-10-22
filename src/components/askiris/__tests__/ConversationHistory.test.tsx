// @vitest-environment jsdom
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { ConversationHistoryPopover, ConversationHistoryView } from "../ConversationHistory";

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

function renderHistory({
  list = conversations,
  onSignIn = null,
  onNew = () => {},
  onBack = () => {},
}: { list?: typeof conversations; onSignIn?: (() => void) | null; onNew?: () => void; onBack?: () => void } = {}) {
  const onRename = vi.fn();
  const onDelete = vi.fn();
  render(
    <ConversationHistoryView
      onBack={onBack}
      conversations={list}
      listState="ready"
      activeConversationId="c1"
      onSelect={() => {}}
      onNew={onNew}
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
  it("tells a visitor without an account how long chats are kept, with a sign-in button below the list", async () => {
    const onSignIn = vi.fn();
    renderHistory({ onSignIn });
    const section = await screen.findByRole("region", { name: "guestChatsKept" });
    fireEvent.click(within(section).getByRole("button", { name: "signIn" }));
    expect(onSignIn).toHaveBeenCalled();
  });

  it("shows no sign-in section to an account", async () => {
    renderHistory();
    await screen.findByText("Street lens under 3000");
    expect(screen.queryByRole("region", { name: "guestChatsKept" })).toBeNull();
  });

  it("goes back to the chat from the in-panel view", async () => {
    const onBack = vi.fn();
    renderHistory({ onBack });
    fireEvent.click(await screen.findByRole("button", { name: "backToChat" }));
    expect(onBack).toHaveBeenCalled();
  });

  it("opens as a popover from its trigger", async () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <ConversationHistoryPopover
          open={open}
          onOpenChange={setOpen}
          trigger={<button type="button">history</button>}
          conversations={conversations}
          listState="ready"
          activeConversationId="c1"
          onSelect={() => {}}
          onNew={() => {}}
          onRename={() => {}}
          onDelete={() => {}}
          onSignIn={null}
        />
      );
    }
    render(<Harness />);
    expect(screen.queryByRole("dialog", { name: "history" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "history" }));
    const popover = await screen.findByRole("dialog", { name: "history" });
    expect(within(popover).getByText("Portrait for X-T5")).toBeInTheDocument();
  });

  it("starts a new chat from the header", async () => {
    const onNew = vi.fn();
    renderHistory({ onNew });
    fireEvent.click(await screen.findByRole("button", { name: "newChat" }));
    expect(onNew).toHaveBeenCalled();
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
