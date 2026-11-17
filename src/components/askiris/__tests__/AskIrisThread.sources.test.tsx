// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import AskIrisThread from "../AskIrisThread";
import type { AskIrisUIMessage } from "@/lib/askiris/message-metadata";

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key, useFormatter: () => ({ dateTime: (date: Date) => date.toISOString() }) }));
vi.mock("@/i18n/navigation", () => ({ Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));
vi.mock("@/components/iris/Iris", () => ({ default: () => null }));
vi.mock("@/components/askiris/ResponseFeedback", () => ({ default: () => null }));
vi.mock("@/components/askiris/Markdown", () => ({ default: ({ children }: { children: string }) => <p>{children}</p> }));
vi.mock("@/components/askiris/RecommendationDeck", () => ({ default: () => null }));
vi.mock("@/components/askiris/LensTable", () => ({ default: () => null }));
vi.mock("@/components/askiris/GearRequestCard", () => ({ default: () => null }));
vi.mock("@/components/askiris/SignInCard", () => ({ SignInGate: ({ reason, answered, active, onAnswer }: { reason: string; answered?: boolean; active: boolean; onAnswer: (approved: boolean) => void }) => (
  <div data-testid="sign-in-gate" data-reason={reason} data-active={active} data-answered={String(answered)}>
    <button onClick={() => onAnswer(false)}>Cancel approval</button>
    <button onClick={() => onAnswer(true)}>Approve</button>
  </div>
) }));

afterEach(cleanup);

const reply: AskIrisUIMessage = {
  id: "a1",
  role: "assistant",
  parts: [
    {
      type: "tool-lensReviews",
      toolCallId: "c1",
      state: "output-available",
      input: {},
      output: { lenses: [{ sources: [{ id: "k3x9q", url: "https://example.com/a", site: "Example", lang: "en", kind: "measured" }] }] },
    } as never,
    { type: "text", text: "Sharp wide open [^](source:k3x9q)." },
  ],
};
const messages: AskIrisUIMessage[] = [{ id: "u1", role: "user", parts: [{ type: "text", text: "Sharp?" }] }, reply];

describe("stored spec-guide tool calls", () => {
  it.each([false, true])("keeps the surrounding answer when debug is %s", (debug) => {
    const history: AskIrisUIMessage[] = [{
      id: "old-guide-answer", role: "assistant", parts: [
        { type: "tool-skill", toolCallId: "old-guide", state: "output-available", input: { name: "terms" }, output: { text: "Original spec guide." } },
        { type: "text", text: "The saved answer." },
      ],
    }];

    render(<AskIrisThread messages={history} debug={debug} />);

    expect(screen.getByText("The saved answer.")).toBeTruthy();
    expect(Boolean(screen.queryByText(/skill · output-available/))).toBe(debug);
    expect(screen.queryByText("Original spec guide.")).toBeNull();
  });
});

describe("native sign-in approvals", () => {
  const cards = () => ({ lenses: [], answerGear: vi.fn(), answerChoices: vi.fn(), answerApproval: vi.fn(), signInReturnTo: () => "/en/askiris" });

  it.each(["myGear", "myFavorites"] as const)("binds %s to the shared approval card", (toolName) => {
    const binding = cards();
    const history: AskIrisUIMessage[] = [{ id: `approval-${toolName}`, role: "assistant", parts: [{
      type: `tool-${toolName}`, toolCallId: "tool-call", input: {}, state: "approval-requested", approval: { id: "approval-id" },
    }] }];
    render(<AskIrisThread messages={history} cards={binding} />);
    const gate = screen.getByTestId("sign-in-gate");
    expect(gate).toHaveAttribute("data-reason", toolName === "myGear" ? "gear" : "favorites");
    expect(gate).toHaveAttribute("data-active", "true");
    expect(gate).toHaveAttribute("data-answered", "undefined");
    fireEvent.click(screen.getByRole("button", { name: "Cancel approval" }));
    fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    expect(binding.answerApproval.mock.calls).toEqual([["approval-id", false], ["approval-id", true]]);
  });

  it.each([true, false])("renders the stored approval %s without changing myGear history", (approved) => {
    const history: AskIrisUIMessage[] = [{ id: "stored-gear", role: "assistant", parts: [{
      type: "tool-myGear", toolCallId: "saved-call", input: {}, state: "approval-responded", approval: { id: "saved-id", approved },
    }, { type: "text", text: "Saved answer." }] }];
    const original = structuredClone(history);
    render(<AskIrisThread messages={history} cards={cards()} />);
    expect(screen.getByTestId("sign-in-gate")).toHaveAttribute("data-answered", String(approved));
    expect(screen.getByText("Saved answer.")).toBeInTheDocument();
    expect(history).toEqual(original);
  });

  it("leaves automatic approvals to the server", () => {
    const history: AskIrisUIMessage[] = [{ id: "automatic", role: "assistant", parts: [{
      type: "tool-myFavorites", toolCallId: "auto-call", input: {}, state: "approval-requested", approval: { id: "auto-id", isAutomatic: true },
    }] }];
    render(<AskIrisThread messages={history} cards={cards()} />);
    expect(screen.queryByTestId("sign-in-gate")).toBeNull();
  });

  it.each(["busy", "old"])("makes a %s approval inactive", (kind) => {
    const history: AskIrisUIMessage[] = [{ id: "inactive", role: "assistant", parts: [{
      type: "tool-myFavorites", toolCallId: "inactive-call", input: {}, state: "approval-requested", approval: { id: "inactive-id" },
    }] }];
    if (kind === "old") {history.push({ id: "new", role: "user", parts: [{ type: "text", text: "Next question." }] });}
    render(<AskIrisThread messages={history} cards={cards()} busy={kind === "busy"} />);
    expect(screen.getByTestId("sign-in-gate")).toHaveAttribute("data-active", "false");
  });
});

describe("the source list under a reply", () => {
  it("waits until the reply has finished streaming", () => {
    render(<AskIrisThread messages={messages} busy />);
    expect(screen.queryByText("title")).toBeNull();
  });

  it("shows the cited sources once the reply is done", () => {
    render(<AskIrisThread messages={messages} />);
    expect(screen.getByText("title")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Example" }).getAttribute("href")).toBe("https://example.com/a");
  });

  it("names the lens catalog first, with a link to how the data is made, when the reply showed catalog data", () => {
    const withCatalog: AskIrisUIMessage[] = [
      messages[0],
      { ...reply, parts: [{ type: "tool-queryLenses", toolCallId: "c0", state: "output-available", input: {}, output: {} } as never, ...reply.parts] },
    ];
    render(<AskIrisThread messages={withCatalog} />);

    const rows = screen.getAllByRole("listitem").map((row) => row.textContent);
    expect(rows[0]).toContain("catalogName");
    expect(rows[1]).toContain("Example");
    expect(screen.getByRole("link", { name: "catalogLink" }).getAttribute("href")).toBe("/about#data-accuracy");
  });

  it("shows only the catalog line when the reply used the catalog and cited no review", () => {
    const catalogOnly: AskIrisUIMessage[] = [
      messages[0],
      { id: "a2", role: "assistant", parts: [{ type: "tool-listLenses", toolCallId: "c2", state: "output-available", input: {}, output: {} } as never, { type: "text", text: "Here they are." }] },
    ];
    render(<AskIrisThread messages={catalogOnly} />);

    expect(screen.getByText("title")).toBeTruthy();
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
  });

  it("shows nothing for a reply that read no catalog data and cited no review", () => {
    const chat: AskIrisUIMessage[] = [messages[0], { id: "a3", role: "assistant", parts: [{ type: "text", text: "Hello." }] }];
    render(<AskIrisThread messages={chat} />);

    expect(screen.queryByText("title")).toBeNull();
  });

  it("does not count the review tool, a tool still running, or a site question as catalog data", () => {
    const other: AskIrisUIMessage[] = [
      messages[0],
      { id: "a4", role: "assistant", parts: [{ type: "tool-queryLenses", toolCallId: "c4", state: "input-available", input: {} } as never, { type: "tool-siteInfo", toolCallId: "c5", state: "output-available", input: {}, output: {} } as never, { type: "text", text: "Working." }] },
    ];
    render(<AskIrisThread messages={other} />);

    expect(screen.queryByText("title")).toBeNull();
  });
});
