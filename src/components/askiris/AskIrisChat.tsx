"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import { useEffectiveMount } from "@/hooks/useMountParam";
import { useTestHookOption } from "@/context/TestHookProvider";
import AskIrisThread from "@/components/askiris/AskIrisThread";
import { FIXTURES } from "@/components/askiris/__fixtures__";

// Experimental AskIris chat. Mount comes from the effective-mount preference
// (URL has none here) and locale from the route; both go through the transport
// body so the server scopes the agent to one mount and replies in one language.
// Text parts render as Markdown prose; each recommendLenses call renders as a
// card deck, interleaved in message.parts order.
export default function AskIrisChat({ locale }: { locale: string }) {
  const mount = useEffectiveMount();
  // Both gated behind the test-hook panel's "AskIris debug" section.
  const debug = useTestHookOption("askIrisTrace") === "on";
  const fixtureId = useTestHookOption("askIrisFixture");
  const [input, setInput] = useState("");
  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/chat", body: { mount, locale } }),
    [mount, locale],
  );
  const { messages, sendMessage, status } = useChat({ transport });

  // Dev-only: the panel's fixture selector replays a saved thread through the real
  // page shell — deterministic UI work (decks, tables, carousel) with no LLM call.
  const fixtureMessages =
    process.env.NODE_ENV !== "production" && fixtureId && fixtureId !== "off"
      ? FIXTURES[fixtureId]
      : null;
  const renderMessages = fixtureMessages ?? messages;

  const isBusy = status === "submitted" || status === "streaming";

  // Follow the newest content as it streams, but only while the user is pinned to
  // the bottom — scrolling up to read mid-stream must not get yanked back down.
  const scrollRef = useRef<HTMLDivElement>(null);
  const pinnedRef = useRef(true);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) {
      return;
    }
    pinnedRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  }

  useEffect(() => {
    if (pinnedRef.current) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    }
  }, [messages]);

  function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = input.trim();
    if (!text || isBusy) {
      return;
    }
    sendMessage({ text });
    setInput("");
  }

  return (
    <div className="mx-auto flex h-[calc(100svh-var(--nav-height)-var(--safe-inset-bottom))] w-full max-w-2xl flex-col px-4">
      <header className="shrink-0 py-4">
        <h1 className="text-lg font-semibold">AskIris</h1>
        <p className="text-muted-foreground text-sm">
          Experimental — describe what you shoot and I&apos;ll recall lenses.
        </p>
      </header>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-4"
      >
        <AskIrisThread messages={renderMessages} locale={locale} debug={debug} />
      </div>

      <form onSubmit={handleSubmit} className="shrink-0 flex gap-2 py-4">
        <input
          className="border-input flex-1 rounded-md border px-3 py-2 text-sm"
          value={input}
          placeholder="e.g. a light lens for travel…"
          onChange={(event) => setInput(event.currentTarget.value)}
          disabled={isBusy}
        />
        <button
          type="submit"
          disabled={isBusy || !input.trim()}
          className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
