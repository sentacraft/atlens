"use client";

import { useChat } from "@ai-sdk/react";
import { track } from "@/lib/analytics/analytics";
import type { UIMessage } from "ai";
import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useEffectiveMount } from "@/hooks/useMountParam";
import { useScrollAffordance } from "@/hooks/useScrollAffordance";
import { useTestHookOption } from "@/context/TestHookProvider";
import AskIrisThread from "@/components/askiris/AskIrisThread";
import { LensLinkProvider } from "@/components/askiris/LensLinkContext";
import type { LensLinkIndex } from "@/lib/ai/lens-ref";
import AskIrisComposer from "@/components/askiris/AskIrisComposer";
import AskIrisEmptyState from "@/components/askiris/AskIrisEmptyState";
import AskIrisDivider from "@/components/askiris/AskIrisDivider";
import AskIrisError, { classifyError } from "@/components/askiris/AskIrisError";
import { useFixtureMessages } from "@/components/askiris/fixtureStore";

type ThreadItem = { kind: "seg"; messages: UIMessage[] } | { kind: "divider"; label: string };

const SHELL_CLS =
  "mx-auto flex h-[calc(100svh-var(--nav-height)-var(--safe-inset-bottom))] w-full max-w-[800px] flex-col px-4";

// Two states on one route: an empty-state landing (centered hero) before the first
// message, and the chat thread after.
export default function AskIrisChat({
  initialQuery,
  lensIndex,
}: {
  initialQuery?: string;
  lensIndex: LensLinkIndex;
}) {
  const t = useTranslations("AskIris");
  const tMount = useTranslations("MountSwitcher");
  const locale = useLocale();
  const mount = useEffectiveMount();
  const debug = useTestHookOption("askIrisTrace") === "on";
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

  // The segment id groups turns into sessions server-side; a new one starts at each
  // segment boundary.
  const [segmentId, setSegmentId] = useState(() => crypto.randomUUID());
  const turnBody = { mount, locale, segmentId };

  // One per load; a mount switch or new chat is in-page and doesn't re-fire it.
  useEffect(() => {
    track("askiris_view");
  }, []);

  function submitText(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isBusy) {
      return;
    }
    sendMessage({ text: trimmed }, { body: turnBody });
    track("askiris_message", { query: trimmed, method: "typed" });
    setInput("");
  }

  // /askiris?q=… arrives as a prop off the server render and auto-sends. The param is
  // then stripped so a refresh doesn't re-fire it. The ref keeps the send out of the
  // dev double-mount, and is a ref rather than a module flag because navigating away
  // and returning with a new query should send again.
  const submitInitialQuery = useEffectEvent((query: string) => {
    sendMessage({ text: query }, { body: turnBody });
    track("askiris_message", { query, method: "handoff" });
  });
  const initialQuerySent = useRef(false);
  useEffect(() => {
    if (initialQuerySent.current || !initialQuery) {
      return;
    }
    initialQuerySent.current = true;
    submitInitialQuery(initialQuery);
    const url = new URL(window.location.href);
    url.searchParams.delete("q");
    window.history.replaceState(null, "", url.toString());
  }, [initialQuery]);

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
      setSegmentId(crypto.randomUUID());
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

  const renderMessages = useFixtureMessages(messages);

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

  // Skip the hero when a hand-off query is pending: it fires on mount and fills the
  // thread, so rendering the empty state first would just flash before the reply.
  if (archived.length === 0 && renderMessages.length === 0 && !initialQuery) {
    return (
      <div className={SHELL_CLS}>
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
      <div className={SHELL_CLS}>
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
            {errorKind && (
              <AskIrisError kind={errorKind} onRetry={() => regenerate({ body: turnBody })} />
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
