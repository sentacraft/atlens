// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AskIrisUIMessage } from "@/lib/askiris/message-metadata";
import en from "@/messages/en.json";
import AskIrisThread from "../AskIrisThread";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock("@/components/iris/Iris", () => ({ default: () => null }));
vi.mock("@/components/askiris/Markdown", () => ({ default: ({ children }: { children: string }) => <p>{children}</p> }));
vi.mock("@/components/askiris/ResponseFeedback", () => ({ default: () => null }));

const THINKING = en.AskIris.thinking;
const GATHERING = en.AskIris.gathering;
const COMPOSING = en.AskIris.composing;

type Part = AskIrisUIMessage["parts"][number];
const user: AskIrisUIMessage = { id: "u", role: "user", parts: [{ type: "text", text: "hi" }] };
const tool = (type: string, state: "input-available" | "output-available", id = type): Part =>
  ({ type, toolCallId: id, state, input: {}, ...(state === "output-available" ? { output: {} } : {}) }) as unknown as Part;
const step: Part = { type: "step-start" };

function thread(parts: Part[]) {
  const messages: AskIrisUIMessage[] = parts.length ? [user, { id: "a", role: "assistant", metadata: { traceId: "t", turnId: "n" }, parts }] : [user];
  return (
    <NextIntlClientProvider locale="en" timeZone="UTC" messages={en}>
      <AskIrisThread messages={messages} busy />
    </NextIntlClientProvider>
  );
}

const label = () => [THINKING, GATHERING, COMPOSING].find((text) => screen.queryByText(text)) ?? null;

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("Iris activity label", () => {
  it("shows thinking only before the first tool, then keeps the last tool's label between steps", () => {
    const { rerender } = render(thread([]));
    expect(label()).toBe(THINKING);
    act(() => { vi.advanceTimersByTime(500); });
    rerender(thread([step, tool("tool-queryLenses", "input-available")]));
    expect(label()).toBe(GATHERING);
    // A finished tool and a new step boundary do not fall back to "thinking".
    rerender(thread([step, tool("tool-queryLenses", "output-available"), step]));
    expect(label()).toBe(GATHERING);
  });

  it("holds a label for 500 ms before changing to another one", () => {
    const { rerender } = render(thread([step, tool("tool-queryLenses", "input-available")]));
    expect(label()).toBe(GATHERING);
    act(() => { vi.advanceTimersByTime(200); });
    rerender(thread([step, tool("tool-queryLenses", "output-available"), step, tool("tool-recommendLenses", "input-available")]));
    expect(label()).toBe(GATHERING);
    act(() => { vi.advanceTimersByTime(299); });
    expect(label()).toBe(GATHERING);
    act(() => { vi.advanceTimersByTime(1); });
    expect(label()).toBe(COMPOSING);
  });

  it("changes at once when the label has been up for 500 ms, and hides at once while text streams", () => {
    const { rerender } = render(thread([step, tool("tool-queryLenses", "input-available")]));
    act(() => { vi.advanceTimersByTime(600); });
    rerender(thread([step, tool("tool-queryLenses", "output-available"), step, tool("tool-recommendLenses", "input-available")]));
    expect(label()).toBe(COMPOSING);
    rerender(thread([step, tool("tool-queryLenses", "output-available"), { type: "text", text: "Here you go" }]));
    expect(label()).toBeNull();
  });
});
