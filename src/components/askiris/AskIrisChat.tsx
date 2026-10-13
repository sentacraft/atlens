"use client";

import { useChat } from "@ai-sdk/react";
import { toast } from "sonner";
import { track } from "@/lib/analytics/analytics";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useEffectiveMount } from "@/hooks/useMountParam";
import { useScrollAffordance } from "@/hooks/useScrollAffordance";
import { useTestHookEnabled, useTestHookOption } from "@/context/TestHookProvider";
import { accountUser, authClient } from "@/lib/auth-client";
import AskIrisThread from "@/components/askiris/AskIrisThread";
import { LensLinkProvider } from "@/components/askiris/LensLinkContext";
import type { LensLinkIndex } from "@/lib/ai/lens-ref";
import { clearEntryParams, type AskIrisEntry } from "@/lib/url/askiris";
import AskIrisComposer from "@/components/askiris/AskIrisComposer";
import AskIrisEmptyState from "@/components/askiris/AskIrisEmptyState";
import AskIrisError, { classifyError } from "@/components/askiris/AskIrisError";
import { useFixtureMessages } from "@/components/askiris/fixtureStore";
import { useConversation } from "@/components/askiris/useConversation";
import ConversationHistory from "@/components/askiris/ConversationHistory";
import {
  askIrisMessageMetadataSchema,
  type AskIrisUIMessage,
} from "@/lib/askiris/message-metadata";

const SHELL_CLS =
  "mx-auto flex h-[calc(100svh-var(--nav-height)-var(--safe-inset-bottom))] w-full max-w-[800px] flex-col px-4";

// Two states on one route: an empty-state landing (centered hero) before the first
// message, and the chat thread after.
export default function AskIrisChat({
  entry,
  lensIndex,
}: {
  entry: AskIrisEntry;
  lensIndex: LensLinkIndex;
}) {
  const initialQuery = entry.kind === "handoff" ? entry.query : undefined;
  const t = useTranslations("AskIris");
  const locale = useLocale();
  const mount = useEffectiveMount();
  const debug = useTestHookOption("askIrisTrace") === "on";
  const [input, setInput] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const { data: session } = authClient.useSession();
  const userId = accountUser(session)?.id;
  // The history entry's placement and look are still being designed.
  const historyEnabled = useTestHookEnabled();
  // Unthrottled, a long stream re-renders on every chunk and the message-derived
  // effects below can trip React's update-depth limit.
  const { messages, sendMessage, status, setMessages, stop, regenerate, error, clearError } = useChat<AskIrisUIMessage>({
    generateId: () => crypto.randomUUID(),
    messageMetadataSchema: askIrisMessageMetadataSchema,
    experimental_throttle: 50,
  });
  const isBusy = status === "submitted" || status === "streaming";
  const conversation = useConversation({
    initialConversationId: entry.kind === "resume" ? entry.conversationId : undefined,
    userId,
    busy: isBusy,
    stop,
    setMessages,
    clearError,
    onNotice: (notice) => {
      if (notice === "unavailable") {
        toast(t("conversationUnavailable"));
      } else {
        toast.error(t("conversationLoadFailed"));
      }
    },
  });
  const { conversationId } = conversation;
  const errorKind = status === "error" ? classifyError(error) : null;
  const turnBody = { mount, locale, conversationId };

  // One per load; switching the current lens context does not create a new chat.
  useEffect(() => {
    track("askiris_view");
  }, []);

  function submitText(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isBusy) {
      return;
    }
    sendMessage({ text: trimmed }, { body: turnBody });
    track("askiris_message", { method: "typed" });
    setInput("");
  }

  // /askiris?q=… arrives as a prop off the server render and auto-sends. The param is
  // then stripped so a refresh doesn't re-fire it. The ref keeps the send out of the
  // dev double-mount, and is a ref rather than a module flag because navigating away
  // and returning with a new query should send again.
  const submitInitialQuery = useEffectEvent((query: string) => {
    sendMessage({ text: query }, { body: turnBody });
    track("askiris_message", { method: "handoff" });
  });
  const initialQuerySent = useRef(false);
  useEffect(() => {
    if (initialQuerySent.current || !initialQuery) {
      return;
    }
    initialQuerySent.current = true;
    clearEntryParams();
    submitInitialQuery(initialQuery);
  }, [initialQuery]);

  const renderMessages = useFixtureMessages(messages);

  const scrollRef = useRef<HTMLDivElement>(null);
  const { canScrollUp, canScrollDown } = useScrollAffordance(scrollRef, [renderMessages]);

  // Follow the stream only while the user is pinned to the bottom — scrolling up to
  // read mid-stream must not yank them back down. The tolerance absorbs the fractional
  // scrollTop a growing container reports at the bottom on non-integer pixel ratios.
  const pinnedRef = useRef(true);
  function handleScroll() {
    const el = scrollRef.current;
    if (el) {
      pinnedRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    }
  }

  useEffect(() => {
    const el = scrollRef.current;
    if (el && pinnedRef.current) {
      el.scrollTo({ top: el.scrollHeight });
    }
  }, [renderMessages]);

  // A switched-to conversation opens at its latest turn.
  useEffect(() => {
    pinnedRef.current = true;
  }, [conversationId]);

  function startNewConversation() {
    conversation.startNewConversation();
    setHistoryOpen(false);
  }

  const historyBar = userId && historyEnabled ? (
    <div className="flex h-12 shrink-0 items-center">
      <ConversationHistory
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        conversations={conversation.conversations}
        listState={conversation.listState}
        activeConversationId={conversationId}
        busy={isBusy}
        onSelect={(id) => {
          conversation.selectConversation(id);
          setHistoryOpen(false);
        }}
        onNew={startNewConversation}
      />
    </div>
  ) : null;

  if (conversation.loading) {
    return (
      <div className={SHELL_CLS}>
        {historyBar}
        <div className="grid flex-1 place-items-center text-sm text-zinc-500 dark:text-zinc-400">
          {t("loadingConversation")}
        </div>
      </div>
    );
  }

  // Skip the hero when a hand-off query is pending: it fires on mount and fills the
  // thread, so rendering the empty state first would just flash before the reply.
  if (renderMessages.length === 0 && !initialQuery) {
    return (
      <div className={SHELL_CLS}>
        {historyBar}
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
        {historyBar}
        <div className="relative min-h-0 flex-1">
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="h-full space-y-4 overflow-y-auto pt-4 pr-3 pb-6 [scrollbar-width:thin] [scrollbar-color:rgb(212_212_216)_transparent] dark:[scrollbar-color:rgb(63_63_70)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-300/70 dark:[&::-webkit-scrollbar-thumb]:bg-zinc-700/70"
          >
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
            streaming={isBusy}
            onStop={stop}
            stopLabel={t("stop")}
            onNewTopic={startNewConversation}
            newTopicLabel={t("newChat")}
            newTopicDisabled={messages.length === 0 || isBusy}
          />
        </div>
      </div>
    </LensLinkProvider>
  );
}
