"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";
import { useEffectiveMount } from "@/hooks/useMountParam";
import { useScrollAffordance } from "@/hooks/useScrollAffordance";
import { useTestHookOption } from "@/context/TestHookProvider";
import AskIrisThread from "@/components/askiris/AskIrisThread";
import {
  subscribe,
  getSnapshot,
  getServerSnapshot,
  publishLive,
  resolveFixture,
} from "@/components/askiris/fixtureStore";

// Experimental AskIris chat. Mount comes from the effective-mount preference
// (URL has none here) and locale from the route; both go through the transport
// body so the server scopes the agent to one mount and replies in one language.
// Text parts render as Markdown prose; each recommendLenses call renders as a
// card deck, interleaved in message.parts order.
export default function AskIrisChat({ locale }: { locale: string }) {
  const mount = useEffectiveMount();
  // Both gated behind the test-hook panel's "AskIris debug" section.
  const debug = useTestHookOption("askIrisTrace") === "on";
  const { selected } = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [input, setInput] = useState("");
  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/chat", body: { mount, locale } }),
    [mount, locale],
  );
  const { messages, sendMessage, status } = useChat({ transport });

  // Dev-only: the panel's fixture selector replays a saved thread through the real
  // page shell — deterministic UI work (decks, tables) with no LLM call.
  // Publish live messages so the panel can capture them into a new fixture.
  useEffect(() => {
    publishLive(messages);
  }, [messages]);
  const fixtureMessages =
    process.env.NODE_ENV !== "production" && selected !== "off"
      ? (resolveFixture(selected) ?? null)
      : null;
  const renderMessages = fixtureMessages ?? messages;

  const isBusy = status === "submitted" || status === "streaming";

  // Follow the newest content as it streams, but only while the user is pinned to
  // the bottom — scrolling up to read mid-stream must not get yanked back down.
  const scrollRef = useRef<HTMLDivElement>(null);
  const pinnedRef = useRef(true);
  // Drives the top/bottom fade overlays — shown only when there's more thread in
  // that direction. Re-measures when the rendered messages change.
  const { canScrollUp, canScrollDown } = useScrollAffordance(scrollRef, [renderMessages]);

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
    <div className="mx-auto flex h-[calc(100svh-var(--nav-height)-var(--safe-inset-bottom))] w-full max-w-[800px] flex-col px-4">
      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="h-full space-y-4 overflow-y-auto pt-4 pr-3 pb-6 [scrollbar-width:thin] [scrollbar-color:rgb(212_212_216)_transparent] dark:[scrollbar-color:rgb(63_63_70)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-300/70 dark:[&::-webkit-scrollbar-thumb]:bg-zinc-700/70"
        >
          <AskIrisThread messages={renderMessages} locale={locale} debug={debug} />
        </div>
        {/* Edge fades as overlays (not a container mask) so the scrollbar stays
            crisp; each shows only when there's more thread that way. Inset from
            the right so they clear the scrollbar. */}
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute top-0 right-3 left-0 h-8 bg-gradient-to-b from-background to-transparent transition-opacity duration-200",
            canScrollUp ? "opacity-100" : "opacity-0",
          )}
        />
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute right-3 bottom-0 left-0 h-10 bg-gradient-to-t from-background to-transparent transition-opacity duration-200",
            canScrollDown ? "opacity-100" : "opacity-0",
          )}
        />
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
