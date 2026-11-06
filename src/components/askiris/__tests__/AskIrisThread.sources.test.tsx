// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
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
vi.mock("@/components/askiris/SignInCard", () => ({ SignInGate: () => null }));

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
