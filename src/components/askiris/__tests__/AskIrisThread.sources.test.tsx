// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import AskIrisThread from "../AskIrisThread";
import type { AskIrisUIMessage } from "@/lib/askiris/message-metadata";

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key, useFormatter: () => ({ dateTime: (date: Date) => date.toISOString() }) }));
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
});
