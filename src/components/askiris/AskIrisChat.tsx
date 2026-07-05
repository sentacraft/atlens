"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useEffectiveMount } from "@/hooks/useMountParam";
import { useScrollAffordance } from "@/hooks/useScrollAffordance";
import { useTestHookOption } from "@/context/TestHookProvider";
import AskIrisThread from "@/components/askiris/AskIrisThread";
import AskIrisComposer from "@/components/askiris/AskIrisComposer";
import AskIrisEmptyState from "@/components/askiris/AskIrisEmptyState";
import {
  subscribe,
  getSnapshot,
  getServerSnapshot,
  publishLive,
  resolveFixture,
} from "@/components/askiris/fixtureStore";

// Experimental AskIris chat. Two states on one route: an empty-state landing
// (centered hero) before the first message, and the chat thread after. mount
// comes from the effective-mount preference and locale from the route; both go
// through the transport body so the server scopes the agent and its language.
export default function AskIrisChat({ locale }: { locale: string }) {
  const t = useTranslations("AskIris");
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

  const isBusy = status === "submitted" || status === "streaming";

  function submitText(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isBusy) {
      return;
    }
    sendMessage({ text: trimmed });
    setInput("");
  }

  // Query entry: /askiris?q=… (e.g. from a Browse-page hand-off) auto-sends once
  // and strips the param, so refreshing doesn't re-fire it — there's no thread
  // persistence, so a refresh just returns to the empty state.
  const queryFired = useRef(false);
  useEffect(() => {
    if (queryFired.current) {
      return;
    }
    const q = new URLSearchParams(window.location.search).get("q")?.trim();
    if (q) {
      queryFired.current = true;
      sendMessage({ text: q });
      const url = new URL(window.location.href);
      url.searchParams.delete("q");
      window.history.replaceState(null, "", url.toString());
    }
  }, [sendMessage]);

  // Dev-only: the panel's fixture selector replays a saved thread through the real
  // page shell — deterministic UI work (decks, tables) with no LLM call. Publish
  // live messages so the panel can capture them into a new fixture.
  useEffect(() => {
    publishLive(messages);
  }, [messages]);
  const fixtureMessages =
    process.env.NODE_ENV !== "production" && selected !== "off"
      ? (resolveFixture(selected) ?? null)
      : null;
  const renderMessages = fixtureMessages ?? messages;

  // Follow the newest content as it streams, but only while the user is pinned to
  // the bottom — scrolling up to read mid-stream must not get yanked back down.
  const scrollRef = useRef<HTMLDivElement>(null);
  const pinnedRef = useRef(true);
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

  const shell = "mx-auto flex h-[calc(100svh-var(--nav-height)-var(--safe-inset-bottom))] w-full max-w-[800px] flex-col px-4";

  if (renderMessages.length === 0) {
    return (
      <div className={shell}>
        <AskIrisEmptyState
          input={input}
          onInputChange={setInput}
          onSubmit={() => submitText(input)}
          onChip={submitText}
          disabled={isBusy}
        />
      </div>
    );
  }

  return (
    <div className={shell}>
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

      <div className="shrink-0 py-4">
        <AskIrisComposer
          size="md"
          value={input}
          onChange={setInput}
          onSubmit={() => submitText(input)}
          disabled={isBusy}
          placeholder={t("placeholder")}
          sendLabel={t("send")}
        />
      </div>
    </div>
  );
}
