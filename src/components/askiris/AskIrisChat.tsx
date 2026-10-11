"use client";

import { useChat } from "@ai-sdk/react";
import { track } from "@/lib/analytics/analytics";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useEffectiveMount } from "@/hooks/useMountParam";
import { useScrollAffordance } from "@/hooks/useScrollAffordance";
import { useTestHookOption } from "@/context/TestHookProvider";
import { authClient } from "@/lib/auth-client";
import AskIrisThread from "@/components/askiris/AskIrisThread";
import { LensLinkProvider } from "@/components/askiris/LensLinkContext";
import type { LensLinkIndex } from "@/lib/ai/lens-ref";
import AskIrisComposer from "@/components/askiris/AskIrisComposer";
import AskIrisEmptyState from "@/components/askiris/AskIrisEmptyState";
import AskIrisError, { classifyError } from "@/components/askiris/AskIrisError";
import { useFixtureMessages } from "@/components/askiris/fixtureStore";
import { useConversation } from "@/components/askiris/useConversation";
import ConversationSidebar from "@/components/askiris/ConversationSidebar";
import {
  askIrisMessageMetadataSchema,
  type AskIrisUIMessage,
} from "@/lib/askiris/message-metadata";

const SHELL_CLS =
  "mx-auto flex h-[calc(100svh-var(--nav-height)-var(--safe-inset-bottom))] w-full max-w-7xl flex-col px-0";

const ANONYMOUS_CONVERSATION_KEY = "atlens:askiris:anonymous-conversation";

type AnonymousConversation = {
  conversationId: string;
  messages: AskIrisUIMessage[];
};

function readAnonymousConversation(): AnonymousConversation | null {
  try {
    const value = sessionStorage.getItem(ANONYMOUS_CONVERSATION_KEY);
    return value ? (JSON.parse(value) as AnonymousConversation) : null;
  } catch {
    return null;
  }
}

// Two states on one route: an empty-state landing (centered hero) before the first
// message, and the chat thread after.
export default function AskIrisChat({
  initialQuery,
  initialConversationId,
  lensIndex,
}: {
  initialQuery?: string;
  initialConversationId?: string;
  lensIndex: LensLinkIndex;
}) {
  const t = useTranslations("AskIris");
  const locale = useLocale();
  const mount = useEffectiveMount();
  const { data: session } = authClient.useSession();
  const authenticated = Boolean(session?.user);
  const debug = useTestHookOption("askIrisTrace") === "on";
  const [input, setInput] = useState("");
  const [mobileHistoryOpen, setMobileHistoryOpen] = useState(false);
  const anonymousConversationRef = useRef<AnonymousConversation | null>(null);
  const anonymousRestoreAttemptedRef = useRef(false);
  const [initialAnonymousConversation] = useState<AnonymousConversation | null>(() => {
    return typeof window === "undefined" ? null : readAnonymousConversation();
  });
  // Unthrottled, a long stream re-renders on every chunk and the message-derived
  // effects below can trip React's update-depth limit.
  const { messages, sendMessage, status, setMessages, stop, regenerate, error } = useChat<AskIrisUIMessage>({
    generateId: () => crypto.randomUUID(),
    messageMetadataSchema: askIrisMessageMetadataSchema,
    experimental_throttle: 50,
  });
  const { conversations, conversationId, loadingList, loadingConversation, listError, refreshConversations, selectConversation, syncConversationUrl, startNewConversation } = useConversation({
    initialConversationId: initialConversationId || initialAnonymousConversation?.conversationId,
    loadInitialConversation: Boolean(initialConversationId),
    authenticated,
    messages,
    stop,
    setMessages,
  });

  const isBusy = status === "submitted" || status === "streaming";
  const errorKind = status === "error" ? classifyError(error) : null;
  const turnBody = { mount, locale, conversationId };

  useEffect(() => {
    anonymousConversationRef.current = initialAnonymousConversation;
  }, [initialAnonymousConversation]);

  useEffect(() => {
    if (authenticated) {
      return;
    }
    if (anonymousRestoreAttemptedRef.current) {
      return;
    }
    anonymousRestoreAttemptedRef.current = true;
    if (messages.length === 0 && initialAnonymousConversation) {
      setMessages(initialAnonymousConversation.messages);
      return;
    }
    if (messages.length === 0) {
      return;
    }
    const snapshot = { conversationId, messages };
    anonymousConversationRef.current = snapshot;
    sessionStorage.setItem(ANONYMOUS_CONVERSATION_KEY, JSON.stringify(snapshot));
  }, [authenticated, conversationId, initialAnonymousConversation, messages, setMessages]);

  function handleNewConversation() {
    startNewConversation();
    if (!authenticated) {
      anonymousConversationRef.current = null;
      sessionStorage.removeItem(ANONYMOUS_CONVERSATION_KEY);
    }
  }

  useEffect(() => {
    if (!authenticated || !anonymousConversationRef.current) {
      return;
    }
    const snapshot = anonymousConversationRef.current;
    let cancelled = false;
    void fetch("/api/askiris/conversations/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversationId: snapshot.conversationId,
        messages: snapshot.messages,
        mount,
        locale,
      }),
    }).then((response) => {
      if (!response.ok || cancelled) {
        return;
      }
      sessionStorage.removeItem(ANONYMOUS_CONVERSATION_KEY);
      anonymousConversationRef.current = null;
      syncConversationUrl();
      void refreshConversations();
    });
    return () => {
      cancelled = true;
    };
  }, [authenticated, locale, messages.length, mount, refreshConversations, syncConversationUrl]);

  const wasBusyRef = useRef(false);
  useEffect(() => {
    if (isBusy) {
      wasBusyRef.current = true;
      return;
    }
    if (wasBusyRef.current && authenticated) {
      void refreshConversations();
    }
    wasBusyRef.current = false;
  }, [authenticated, isBusy, refreshConversations]);

  // One per load; switching the current lens context does not create a new chat.
  useEffect(() => {
    track("askiris_view");
  }, []);

  function submitText(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isBusy) {
      return;
    }
    if (authenticated) {
      syncConversationUrl();
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
    if (authenticated) {
      syncConversationUrl();
    }
    sendMessage({ text: query }, { body: turnBody });
    track("askiris_message", { method: "handoff" });
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

  // Skip the hero when a hand-off query is pending: it fires on mount and fills the
  // thread, so rendering the empty state first would just flash before the reply.
  if (loadingConversation) {
    return (
      <div className={SHELL_CLS}>
        <div className="grid flex-1 place-items-center text-sm text-muted-foreground">
          {t("loadingConversation")}
        </div>
      </div>
    );
  }

  if (renderMessages.length === 0 && !initialQuery) {
    return (
      <div className={SHELL_CLS}>
        <div className="flex min-h-0 flex-1">
          <ConversationSidebar
            authenticated={authenticated}
            conversations={conversations}
            activeConversationId={conversationId}
            loading={loadingList}
            error={listError}
            mobileOpen={mobileHistoryOpen}
            onMobileOpenChange={setMobileHistoryOpen}
            onNewConversation={handleNewConversation}
            onSelectConversation={(id) => void selectConversation(id)}
          />
          <div className="flex min-w-0 flex-1 flex-col px-4">
            <AskIrisEmptyState
              input={input}
              onInputChange={setInput}
              onSubmit={() => submitText(input)}
              onChip={setInput}
              disabled={isBusy}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <LensLinkProvider index={lensIndex}>
      <div className={SHELL_CLS}>
        <div className="flex min-h-0 flex-1">
          <ConversationSidebar
            authenticated={authenticated}
            conversations={conversations}
            activeConversationId={conversationId}
            loading={loadingList}
            error={listError}
            mobileOpen={mobileHistoryOpen}
            onMobileOpenChange={setMobileHistoryOpen}
            onNewConversation={handleNewConversation}
            onSelectConversation={(id) => void selectConversation(id)}
          />
          <div className="flex min-w-0 flex-1 flex-col px-4">
            <div className="relative min-h-0 flex-1">
              <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="mx-auto h-full max-w-[800px] space-y-4 overflow-y-auto pt-4 pr-3 pb-6 [scrollbar-width:thin] [scrollbar-color:rgb(212_212_216)_transparent] dark:[scrollbar-color:rgb(63_63_70)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-300/70 dark:[&::-webkit-scrollbar-thumb]:bg-zinc-700/70"
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

            <div className="mx-auto w-full max-w-[800px] shrink-0 py-4">
              <AskIrisComposer
                size="md"
                value={input}
                onChange={setInput}
                onSubmit={() => submitText(input)}
                disabled={isBusy}
                placeholder={t("placeholder")}
                sendLabel={t("send")}
                onNewTopic={handleNewConversation}
                newTopicLabel={t("newChat")}
                newTopicDisabled={messages.length === 0}
              />
            </div>
          </div>
        </div>
      </div>
    </LensLinkProvider>
  );
}
