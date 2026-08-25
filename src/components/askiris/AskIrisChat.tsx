"use client";

import { useChat } from "@ai-sdk/react";
import { track } from "@/lib/analytics/analytics";
import type { UIMessage } from "ai";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { isChatErrorKind, type ChatErrorKind } from "@/lib/ai/chat-errors";
import { useEffectiveMount } from "@/hooks/useMountParam";
import { useScrollAffordance } from "@/hooks/useScrollAffordance";
import { useTestHookOption } from "@/context/TestHookProvider";
import AskIrisThread from "@/components/askiris/AskIrisThread";
import { LensLinkProvider } from "@/components/askiris/LensLinkContext";
import type { LensLinkIndex } from "@/lib/ai/lens-ref";
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

type ThreadItem = { kind: "seg"; messages: UIMessage[] } | { kind: "divider"; label: string };

// "transient" is an untagged stream or network error, where a retry may succeed.
type ErrorDisplay = ChatErrorKind | "transient";

// A Record, so adding a ChatErrorKind server-side won't typecheck until a message
// is chosen here too.
const ERROR_MESSAGE_KEY: Record<ChatErrorKind, "rateLimited" | "errorUnavailable"> = {
  rate_limit: "rateLimited",
  unavailable: "errorUnavailable",
};

// The transport throws with the raw response body as the Error message and no status
// code, so the route tags those bodies with a `kind` and we read it back out here.
function classifyError(error: Error | undefined): ErrorDisplay {
  if (error) {
    try {
      const body = JSON.parse(error.message) as { kind?: unknown };
      if (isChatErrorKind(body.kind)) {
        return body.kind;
      }
    } catch {
      // Not a tagged body — fall through to transient.
    }
  }
  return "transient";
}

// Two states on one route: an empty-state landing (centered hero) before the first
// message, and the chat thread after.
export default function AskIrisChat({
  locale,
  initialQuery,
  lensIndex,
}: {
  locale: string;
  initialQuery?: string;
  lensIndex: LensLinkIndex;
}) {
  const t = useTranslations("AskIris");
  const tMount = useTranslations("MountSwitcher");
  const mount = useEffectiveMount();
  // Both gated behind the test-hook panel's "AskIris debug" section.
  const debug = useTestHookOption("askIrisTrace") === "on";
  const { selected } = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [input, setInput] = useState("");
  // Closed-off segments, rendered read-only above the live thread and never re-sent
  // to the model.
  const [archived, setArchived] = useState<ThreadItem[]>([]);
  // Unthrottled, a long stream re-renders on every chunk and the message-derived
  // effects below can trip React's update-depth limit.
  const { messages, sendMessage, status, setMessages, stop, regenerate, error } = useChat({
    experimental_throttle: 50,
  });

  const isBusy = status === "submitted" || status === "streaming";
  const errorKind = status === "error" ? classifyError(error) : null;

  // Sent with every turn so the server can group turns into sessions. In a ref: it
  // must not trigger a re-render, and is read lazily at send time.
  const segmentIdRef = useRef<string>("");
  function currentSegmentId(): string {
    if (!segmentIdRef.current) {
      segmentIdRef.current = crypto.randomUUID();
    }
    return segmentIdRef.current;
  }

  // One per load; a mount switch or new chat is in-page and doesn't re-fire it.
  useEffect(() => {
    track("askiris_view");
  }, []);

  function submitText(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isBusy) {
      return;
    }
    sendMessage({ text: trimmed }, { body: { mount, locale, segmentId: currentSegmentId() } });
    track("askiris_message", { query: trimmed, method: "typed" });
    setInput("");
  }

  // /askiris?q=… (a Browse-page hand-off) auto-sends once. The param is stripped from
  // the URL afterwards so a refresh doesn't re-fire it.
  const queryFired = useRef(false);
  useEffect(() => {
    if (queryFired.current || !initialQuery) {
      return;
    }
    queryFired.current = true;
    sendMessage({ text: initialQuery }, { body: { mount, locale, segmentId: currentSegmentId() } });
    track("askiris_message", { query: initialQuery, method: "handoff" });
    const url = new URL(window.location.href);
    url.searchParams.delete("q");
    window.history.replaceState(null, "", url.toString());
  }, [initialQuery, sendMessage, mount, locale]);

  // Lets the switch below read the live segment without re-running on every streamed
  // message.
  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Shared by the mount switch and the "new chat" button.
  const startNewSegment = useCallback(
    (label: string) => {
      // So the remaining deltas of an in-flight stream don't leak past the reset.
      stop();
      // Snapshot (copy) the segment so it's detached from useChat's array.
      const live = [...messagesRef.current];
      setArchived((prev) => {
        if (live.length === 0 && prev.length === 0) {
          return prev;
        }
        // Asked again without chatting — retarget the trailing divider rather than
        // stack an empty one.
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
      segmentIdRef.current = crypto.randomUUID();
    },
    [stop, setMessages],
  );

  // A mount switch swaps the agent's whole lens catalogue, so a thread can't continue
  // across one.
  const prevMountRef = useRef(mount);
  useEffect(() => {
    if (prevMountRef.current === mount) {
      return;
    }
    prevMountRef.current = mount;
    startNewSegment(t("switchedMount", { mount: mount === "G" ? tMount("gfx") : tMount("x") }));
  }, [mount, startNewSegment, t, tMount]);

  // Dev-only: publish live messages so the test-hook panel can capture them into a
  // fixture, and replay a selected one through the real page shell — deterministic
  // UI work (decks, tables) with no LLM call.
  useEffect(() => {
    publishLive(messages);
  }, [messages]);
  const fixtureMessages =
    process.env.NODE_ENV !== "production" && selected !== "off"
      ? (resolveFixture(selected) ?? null)
      : null;
  const renderMessages = fixtureMessages ?? messages;

  // Follow the stream only while the user is pinned to the bottom — scrolling up to
  // read mid-stream must not yank them back down.
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

  // A closed topic appends its divider; jump to it so the fresh thread is in view
  // rather than leaving the user parked up in the archived history.
  useEffect(() => {
    if (archived.length === 0) {
      return;
    }
    const el = scrollRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight });
      pinnedRef.current = true;
    }
  }, [archived]);

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
    <LensLinkProvider index={lensIndex}>
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
                <AskIrisThread key={`s${i}`} messages={item.messages} debug={debug} />
              ),
            )}
            <AskIrisThread messages={renderMessages} debug={debug} busy={isBusy} />
            {/* useChat catches request and stream errors into status "error" but
                renders nothing on its own. Only a transient failure is worth a retry:
                a rate-limit needs a wait, an outage will fail identically. */}
            {errorKind && (
              <div role="alert" className="px-1 text-sm text-zinc-500 dark:text-zinc-400">
                {errorKind === "transient" ? (
                  t.rich("errorRetry", {
                    retry: (chunks) => (
                      <button
                        type="button"
                        onClick={() => regenerate({ body: { mount, locale, segmentId: currentSegmentId() } })}
                        className="font-medium text-zinc-700 underline underline-offset-2 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
                      >
                        {chunks}
                      </button>
                    ),
                  })
                ) : (
                  <span>{t(ERROR_MESSAGE_KEY[errorKind])}</span>
                )}
              </div>
            )}
          </div>
          {/* Overlays rather than a container mask, so the scrollbar stays crisp;
              inset from the right so they clear it. */}
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
    </LensLinkProvider>
  );
}
