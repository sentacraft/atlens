"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useEffectiveMount } from "@/hooks/useMountParam";
import { useScrollAffordance } from "@/hooks/useScrollAffordance";
import { useTestHookOption } from "@/context/TestHookProvider";
import AskIrisThread from "@/components/askiris/AskIrisThread";
import AskIrisComposer from "@/components/askiris/AskIrisComposer";
import AskIrisEmptyState from "@/components/askiris/AskIrisEmptyState";
import AskIrisDivider from "@/components/askiris/AskIrisDivider";
import {
  subscribe,
  getSnapshot,
  getServerSnapshot,
  publishLive,
  resolveFixture,
} from "@/components/askiris/fixtureStore";

// A finished conversation segment, or the divider that closes one off. Mount is
// the agent's whole lens world, so switching it can't continue a thread — the
// prior segment is archived above a divider (still scrollable) and Iris starts
// fresh below it, with only the live segment sent to the model.
type ThreadItem = { kind: "seg"; messages: UIMessage[] } | { kind: "divider"; label: string };

// Experimental AskIris chat. Two states on one route: an empty-state landing
// (centered hero) before the first message, and the chat thread after. mount
// comes from the effective-mount preference and locale from the route; both go
// through the transport body so the server scopes the agent and its language.
export default function AskIrisChat({ locale, initialQuery }: { locale: string; initialQuery?: string }) {
  const t = useTranslations("AskIris");
  const tMount = useTranslations("MountSwitcher");
  const mount = useEffectiveMount();
  // Both gated behind the test-hook panel's "AskIris debug" section.
  const debug = useTestHookOption("askIrisTrace") === "on";
  const { selected } = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [input, setInput] = useState("");
  // Segments closed off by an earlier mount switch — rendered read-only above the
  // live thread, never re-sent to the model.
  const [archived, setArchived] = useState<ThreadItem[]>([]);
  // mount + locale ride on each sendMessage's per-request body (below), not the
  // transport — a mid-thread mount switch must reach the server on the very next
  // turn, and useChat doesn't re-adopt a rebuilt transport.
  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/chat" }), []);
  const { messages, sendMessage, status, setMessages, stop } = useChat({ transport });

  const isBusy = status === "submitted" || status === "streaming";

  function submitText(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isBusy) {
      return;
    }
    sendMessage({ text: trimmed }, { body: { mount, locale } });
    setInput("");
  }

  // Query entry: /askiris?q=… (e.g. from a Browse-page hand-off) auto-sends once.
  // The page reads it server-side and hands it down as a prop, so the first render
  // is already the thread (see the empty-state guard below) rather than the hero.
  // We still strip the param from the URL so a refresh doesn't re-fire it — there's
  // no thread persistence, so a refresh returns to the empty state.
  const queryFired = useRef(false);
  useEffect(() => {
    if (queryFired.current || !initialQuery) {
      return;
    }
    queryFired.current = true;
    sendMessage({ text: initialQuery }, { body: { mount, locale } });
    const url = new URL(window.location.href);
    url.searchParams.delete("q");
    window.history.replaceState(null, "", url.toString());
  }, [initialQuery, sendMessage, mount, locale]);

  // Read the live segment lazily at switch time, without re-running the switch
  // effect on every streamed message.
  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Close off the current segment: archive it above a labelled divider (still
  // scrollable), abort any in-flight stream so its remaining deltas don't leak
  // into the reset, and clear the live thread. Shared by the mount switch and
  // the "new chat" button; only the current segment is ever sent to the model.
  const startNewSegment = useCallback(
    (label: string) => {
      stop();
      // Snapshot (copy) the segment so it's detached from useChat's array.
      const live = [...messagesRef.current];
      setArchived((prev) => {
        // Nothing live and no history: nothing to divide.
        if (live.length === 0 && prev.length === 0) {
          return prev;
        }
        // Boundary requested again without chatting — retarget the trailing
        // divider instead of stacking an empty one.
        if (live.length === 0 && prev[prev.length - 1]?.kind === "divider") {
          return [...prev.slice(0, -1), { kind: "divider", label }];
        }
        const next = [...prev];
        if (live.length > 0) {
          next.push({ kind: "seg", messages: live });
        }
        next.push({ kind: "divider", label });
        return next;
      });
      setMessages([]);
      setInput("");
    },
    [stop, setMessages],
  );

  // Mount switch = a new agent world, so it can't continue a thread. mount/locale
  // ride on the next sendMessage's body, so the new turn reaches the right
  // catalogue.
  const prevMountRef = useRef(mount);
  useEffect(() => {
    if (prevMountRef.current === mount) {
      return;
    }
    prevMountRef.current = mount;
    startNewSegment(t("switchedMount", { mount: mount === "G" ? tMount("gfx") : tMount("x") }));
  }, [mount, startNewSegment, t, tMount]);

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
  const { canScrollUp, canScrollDown } = useScrollAffordance(scrollRef, [archived, renderMessages]);

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

  // Skip the hero when a hand-off query is pending: it fires on mount and fills the
  // thread, so rendering the empty state first would just flash before the reply.
  if (archived.length === 0 && renderMessages.length === 0 && !initialQuery) {
    return (
      <div className={shell}>
        <AskIrisEmptyState
          input={input}
          onInputChange={setInput}
          onSubmit={() => submitText(input)}
          onChip={setInput}
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
          {archived.map((item, i) =>
            item.kind === "divider" ? (
              <AskIrisDivider key={`d${i}`} label={item.label} />
            ) : (
              <AskIrisThread key={`s${i}`} messages={item.messages} locale={locale} debug={debug} />
            ),
          )}
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
          onNewTopic={() => startNewSegment(t("newTopic"))}
          newTopicLabel={t("newChat")}
          newTopicDisabled={renderMessages.length === 0}
        />
      </div>
    </div>
  );
}
