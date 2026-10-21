"use client";

import { useChat } from "@ai-sdk/react";
import { toast } from "sonner";
import { track } from "@/lib/analytics/analytics";
import type { StarterPool } from "@/lib/askiris/starter-questions";
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useEffectiveMount } from "@/hooks/useMountParam";
import { useScrollAffordance } from "@/hooks/useScrollAffordance";
import { useTestHookOption } from "@/context/TestHookProvider";
import type { IrisPanelRequest } from "@/context/IrisPanelProvider";
import { useSignInDialog } from "@/context/SignInDialogProvider";
import { accountUser, authClient, ensureSession } from "@/lib/auth-client";
import AskIrisThread from "@/components/askiris/AskIrisThread";
import { ChatLinkProvider } from "@/components/askiris/ChatLinkContext";
import type { ChatLinkTargets } from "@/lib/askiris/inline-links";
import type { LensSummary } from "@/lib/lens/data";
import { ASK_FOR_GEAR } from "@/lib/ai/gear-request";
import {
  clearEntryParams,
  DETACHED_CONVERSATION_LOCATION,
  URL_CONVERSATION_LOCATION,
  type AskIrisEntry,
} from "@/lib/url/askiris";
import { pageKey, parsePagePath } from "@/lib/askiris/page-ref";
import { PageContextCard, PageContextStart, usePageContextView } from "@/components/askiris/PageContext";
import AskIrisComposer from "@/components/askiris/AskIrisComposer";
import AskIrisEmptyState from "@/components/askiris/AskIrisEmptyState";
import AskIrisError, { classifyError } from "@/components/askiris/AskIrisError";
import { useFixtureMessages } from "@/components/askiris/fixtureStore";
import { useConversation, useTurnSync } from "@/components/askiris/useConversation";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPopup,
  DialogTitle,
} from "@/components/ui/dialog";
import { ACTION_QUIET_CLS, ACTION_PRIMARY_CLS, ICON_CLOSE_BTN_CLS, ICON_NAV_BTN_CLS, TEXT_LINK_CLS } from "@/config/ui-tokens";
import { History, Maximize2, Minimize2, Plus, X } from "lucide-react";
import AiTag from "@/components/iris/AiTag";
import ConversationHistory from "@/components/askiris/ConversationHistory";
import type { AskIrisUIMessage } from "@/lib/askiris/message-metadata";
import { openChat, setModelPreset } from "@/components/askiris/live-chats";

type ConversationSwitch = { kind: "select"; id: string } | { kind: "new"; reason: "manual" | "page_change" };

/** How a message came to be sent, for analytics. */
type MessageSource = { method: "typed" | "handoff" | "suggestion" } | { method: "starter"; pool: StarterPool };

const TOP_BAR_BTN_CLS = cn(ICON_NAV_BTN_CLS, "h-9 gap-1.5 px-2.5 text-sm");

const SHELL_CLS = {
  page: "mx-auto flex h-[calc(100svh-var(--nav-height)-var(--safe-inset-bottom))] w-full max-w-[800px] flex-col px-4",
  panel: "flex h-full w-full flex-col px-4",
  expandedPanel: "mx-auto flex h-full w-full max-w-[800px] flex-col px-4",
};

/**
 * Where the chat lives: the Ask Iris page, or the side panel that follows the user across
 * pages; `pagePath` is the page beside the panel, which `expanded` covers.
 */
export type AskIrisShell =
  | { variant: "page"; entry: AskIrisEntry; starterSeed: number }
  | {
      variant: "panel";
      pagePath: string;
      request: IrisPanelRequest | null;
      onClose: () => void;
      expanded: boolean;
      onExpandedChange: (expanded: boolean) => void;
    };

const NO_ENTRY: AskIrisEntry = {};

export default function AskIrisChat({
  shell,
  linkTargets,
  lenses,
}: {
  shell: AskIrisShell;
  linkTargets: ChatLinkTargets;
  lenses: LensSummary[];
}) {
  const entry = shell.variant === "page" ? shell.entry : NO_ENTRY;
  const t = useTranslations("AskIris");
  const tEntry = useTranslations("IrisEntry");
  const openSignIn = useSignInDialog();
  const locale = useLocale();
  const mount = useEffectiveMount();
  const debug = useTestHookOption("askIrisTrace") === "on";
  const modelPreset = useTestHookOption("askIrisModel");
  useEffect(() => setModelPreset(modelPreset), [modelPreset]);
  const [input, setInput] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [pendingSwitch, setPendingSwitch] = useState<ConversationSwitch | null>(null);
  // Whether the page goes along with each turn; the context card's × turns it off.
  const [attached, setAttached] = useState(true);
  // The page key this conversation is about, set by its first turn; undefined when not known.
  const [conversationPage, setConversationPage] = useState<string | null | undefined>();
  const [freshNotice, setFreshNotice] = useState(false);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const pagePath = shell.variant === "panel" ? shell.pagePath : null;
  const pageView = usePageContextView(pagePath, lenses);
  const contextView = attached ? pageView : null;
  const contextPath = contextView ? pagePath : null;
  const { data: session, isPending: sessionPending } = authClient.useSession();
  // Guests have a session too, and their own stored conversations.
  const userId = session?.user.id;
  const isAccount = Boolean(accountUser(session));
  const conversation = useConversation({
    initialConversationId: entry.conversationId,
    userId,
    onNotice: (notice) => {
      if (notice === "unavailable") {
        toast(t("conversationUnavailable"));
      } else if (notice === "saveFailed") {
        toast.error(t("conversationSaveFailed"));
      } else {
        toast.error(t("conversationLoadFailed"));
      }
    },
    location: shell.variant === "page" ? URL_CONVERSATION_LOCATION : DETACHED_CONVERSATION_LOCATION,
  });
  const { conversationId } = conversation;
  // Unthrottled, per-chunk re-renders trip React's update-depth limit.
  const chat = useMemo(
    () => openChat(conversationId, conversation.initialMessages),
    [conversationId, conversation.initialMessages],
  );
  const { messages, sendMessage, status, setMessages, stop, regenerate, error, addToolOutput, addToolApprovalResponse } =
    useChat<AskIrisUIMessage>({
    chat,
    experimental_throttle: 50,
  });
  // useChat leaves a chat it was handed running; switching conversations still stops the old reply.
  const previousChat = useRef(chat);
  useEffect(() => {
    const previous = previousChat.current;
    previousChat.current = chat;
    if (previous !== chat) {
      void previous.stop();
    }
  }, [chat]);
  const isBusy = signingIn || status === "submitted" || status === "streaming";
  useTurnSync({
    conversationId,
    userId,
    busy: isBusy,
    turnFailed: status === "error",
    historyChanged: messages.at(-1)?.metadata?.historyChanged === true,
    setMessages,
    location: shell.variant === "page" ? URL_CONVERSATION_LOCATION : DETACHED_CONVERSATION_LOCATION,
  });
  const errorKind = status === "error" ? classifyError(error) : null;
  const turnBody = () => ({ mount, locale, ...(contextPath ? { page: contextPath } : {}) });

  useEffect(() => {
    track("askiris_view");
  }, []);

  // Conversations are stored per user, so a visitor's first turn creates an anonymous one.
  async function send(text: string, source: MessageSource): Promise<boolean> {
    if (!session) {
      setSigningIn(true);
      const ready = await ensureSession();
      setSigningIn(false);
      if (!ready) {
        toast.error(t("errorUnavailable"));
        return false;
      }
    }
    if (messages.length === 0) {
      setConversationPage(pageKey(contextPath ? parsePagePath(contextPath) : null));
    }
    void sendMessage({ text }, { body: turnBody() });
    track("askiris_message", source);
    return true;
  }

  async function submitText(text: string, source: MessageSource = { method: "typed" }) {
    const trimmed = text.trim();
    if (!trimmed || isBusy) {
      return;
    }
    if (await send(trimmed, source)) {
      setInput("");
    }
  }

  // A ref, not a module flag: returning with a new question must hand it in again.
  const entryHandled = useRef(false);
  const handleEntry = useEffectEvent(() => {
    clearEntryParams();
    if (entry.question) {
      void send(entry.question, { method: "handoff" });
    }
  });
  useEffect(() => {
    if (entryHandled.current || !entry.question) {
      return;
    }
    entryHandled.current = true;
    handleEntry();
  }, [entry.question]);

  // An entry on another page than the conversation's starts a new conversation about this one.
  const receiveRequest = useEffectEvent((request: IrisPanelRequest) => {
    if (isBusy) {
      if (request.kind === "question") {
        setInput(request.text);
      }
      return;
    }
    const here = shell.variant === "panel" ? pageKey(parsePagePath(shell.pagePath)) : null;
    const fresh = messages.length > 0 && conversationPage !== here;
    if (fresh) {
      switchConversation({ kind: "new", reason: "page_change" });
      setFreshNotice(true);
    }
    setAttached(true);
    if (request.kind === "question") {
      if (fresh) {
        setPendingQuestion(request.text);
      } else {
        void send(request.text, { method: "handoff" });
      }
    }
  });
  const panelRequest = shell.variant === "panel" ? shell.request : null;
  const handledRequestId = useRef(0);
  useEffect(() => {
    if (!panelRequest || panelRequest.id === handledRequestId.current) {
      return;
    }
    handledRequestId.current = panelRequest.id;
    receiveRequest(panelRequest);
  }, [panelRequest]);

  // Sent once the new conversation it waited for is the active chat.
  const sendPending = useEffectEvent((text: string) => {
    setPendingQuestion(null);
    void send(text, { method: "handoff" });
  });
  useEffect(() => {
    if (pendingQuestion) {
      sendPending(pendingQuestion);
    }
  }, [pendingQuestion, conversationId]);

  const renderMessages = useFixtureMessages(messages);

  const scrollRef = useRef<HTMLDivElement>(null);
  const { canScrollUp, canScrollDown } = useScrollAffordance(scrollRef, [renderMessages]);

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

  useEffect(() => {
    pinnedRef.current = true;
  }, [conversationId]);

  function switchConversation(target: ConversationSwitch) {
    setHistoryOpen(false);
    setAttached(true);
    setConversationPage(undefined);
    setFreshNotice(false);
    if (target.kind === "new") {
      track("askiris_new_conversation", { reason: target.reason });
      conversation.startNewConversation();
    } else {
      conversation.selectConversation(target.id);
    }
  }

  // Leaving a conversation stops its reply, so ask first while one is being written.
  function requestSwitch(target: ConversationSwitch) {
    if (isBusy) {
      setHistoryOpen(false);
      setPendingSwitch(target);
    } else {
      switchConversation(target);
    }
  }

  function confirmSwitch() {
    if (pendingSwitch) {
      stop();
      switchConversation(pendingSwitch);
    }
    setPendingSwitch(null);
  }

  function startNewConversation() {
    requestSwitch({ kind: "new", reason: "manual" });
  }

  function detachContext() {
    if (contextView) {
      track("askiris_context_remove", { page_kind: contextView.kind });
    }
    setAttached(false);
  }

  const collapsedPanel = shell.variant === "panel" && !shell.expanded;
  // History needs the room of the full view: the panel expands to show it.
  function openHistory() {
    if (collapsedPanel) {
      shell.onExpandedChange(true);
    }
    setHistoryOpen(true);
  }
  const shellCls =
    shell.variant === "page" ? SHELL_CLS.page : shell.expanded ? SHELL_CLS.expandedPanel : SHELL_CLS.panel;
  const historyControls = (
    <>
      <button type="button" onClick={openHistory} title={t("history")} className={TOP_BAR_BTN_CLS}>
        <History className="size-4" />
        <span className={collapsedPanel ? "sr-only" : "max-sm:sr-only"}>{t("history")}</span>
      </button>
      {!sessionPending && !isAccount && (
        <button
          type="button"
          onClick={() => openSignIn("iris_top_bar")}
          title={t("guestChatsKept")}
          className={cn(TEXT_LINK_CLS, "min-w-0 truncate px-1.5 text-xs")}
        >
          {t("signInToKeepChats")}
        </button>
      )}
    </>
  );
  const history = (
    <ConversationHistory
      open={historyOpen}
      onOpenChange={setHistoryOpen}
      conversations={conversation.conversations}
      listState={conversation.listState}
      activeConversationId={conversationId}
      onSelect={(id) => requestSwitch({ kind: "select", id })}
      onNew={startNewConversation}
      onRename={conversation.renameConversation}
      onDelete={conversation.deleteConversation}
      onSignIn={isAccount ? null : () => openSignIn("iris_history")}
    />
  );
  const notice = freshNotice ? (
    <p className="rounded-xl bg-zinc-100 px-3 py-2 text-xs leading-relaxed text-zinc-600">{tEntry("newConversation")}</p>
  ) : null;
  const topBar = shell.variant === "panel" ? (
    <div className="-mx-1 flex h-12 shrink-0 items-center justify-between">
      <div className="flex min-w-0 items-center gap-1">
        <span className="inline-flex items-center gap-1.5 px-1 text-sm font-semibold text-zinc-900">
          Iris
          <AiTag />
        </span>
        {historyControls}
      </div>
      <div className="flex items-center gap-0.5">
        {messages.length > 0 && (
          <button type="button" onClick={startNewConversation} aria-label={t("newChat")} title={t("newChat")} className={cn(ICON_NAV_BTN_CLS, "h-8 w-8")}>
            <Plus className="size-4" />
          </button>
        )}
        <button
          type="button"
          onClick={() => shell.onExpandedChange(!shell.expanded)}
          aria-label={shell.expanded ? t("exitFullScreen") : t("fullScreen")}
          title={shell.expanded ? t("exitFullScreen") : t("fullScreen")}
          className={cn(ICON_NAV_BTN_CLS, "h-8 w-8")}
        >
          {shell.expanded ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
        </button>
        <button type="button" onClick={shell.onClose} aria-label={t("closePanel")} className={cn(ICON_CLOSE_BTN_CLS, "h-8 w-8")}>
          <X className="size-4" />
        </button>
      </div>
      {history}
    </div>
  ) : (
    <div className="flex h-12 shrink-0 items-center justify-between">
      <div className="flex min-w-0 items-center gap-1">
        {historyControls}
      </div>
      {messages.length > 0 && (
        <button type="button" onClick={startNewConversation} className={TOP_BAR_BTN_CLS}>
          <Plus className="size-4" />
          {t("newChat")}
        </button>
      )}
      {history}
    </div>
  );

  if (conversation.loading) {
    return (
      <div className={shellCls}>
        {topBar}
        <div className="grid flex-1 place-items-center text-sm text-zinc-500">
          {t("loadingConversation")}
        </div>
      </div>
    );
  }

  if (renderMessages.length === 0 && contextView && !entry.question && !pendingQuestion) {
    return (
      <div className={shellCls}>
        {topBar}
        <PageContextStart
          view={contextView}
          notice={notice}
          onDetach={detachContext}
          onSuggestion={(text) => void submitText(text, { method: "suggestion" })}
          disabled={isBusy}
          composer={
            <AskIrisComposer
              size="md"
              value={input}
              onChange={setInput}
              onSubmit={() => void submitText(input)}
              disabled={isBusy}
              placeholder={contextView.placeholder}
              sendLabel={t("send")}
              autoFocus
            />
          }
        />
      </div>
    );
  }

  if (renderMessages.length === 0 && !entry.question && !pendingQuestion) {
    return (
      <div className={shellCls}>
        {topBar}
        {notice}
        <AskIrisEmptyState
          variant={shell.variant}
          input={input}
          onInputChange={setInput}
          onSubmit={() => void submitText(input)}
          onStarter={(starter) => void submitText(starter.text, { method: "starter", pool: starter.pool })}
          starterSeed={shell.variant === "page" ? shell.starterSeed : null}
          disabled={isBusy}
        />
      </div>
    );
  }

  return (
    <ChatLinkProvider targets={linkTargets}>
      <div className={shellCls}>
        {topBar}
        {notice}
        {contextView && (
          <div className="flex pt-1">
            <PageContextCard view={contextView} variant="chip" onDetach={detachContext} />
          </div>
        )}
        <div className="relative min-h-0 flex-1">
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="h-full space-y-4 overflow-y-auto pt-4 pr-3 pb-6 [scrollbar-width:thin] [scrollbar-color:rgb(212_212_216)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-300/70"
          >
            <AskIrisThread
              messages={renderMessages}
              debug={debug}
              busy={isBusy}
              cards={{
                lenses,
                answerGear: (toolCallId, output) =>
                  void addToolOutput({ tool: ASK_FOR_GEAR, toolCallId, output, options: { body: turnBody() } }),
                answerSignIn: (id, approved) =>
                  void addToolApprovalResponse({ id, approved, options: { body: turnBody() } }),
              }}
            />
            {errorKind && (
              <AskIrisError kind={errorKind} onRetry={() => regenerate({ body: turnBody() })} />
            )}
          </div>
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
            onSubmit={() => void submitText(input)}
            disabled={isBusy}
            placeholder={t("placeholder")}
            sendLabel={t("send")}
            streaming={isBusy}
            onStop={stop}
            stopLabel={t("stop")}
          />
        </div>
      </div>
      <Dialog open={pendingSwitch !== null} onOpenChange={(open) => !open && setPendingSwitch(null)}>
        <DialogPopup className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("switchWhileBusyTitle")}</DialogTitle>
            <DialogDescription>{t("switchWhileBusyBody")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose
              type="button"
              className={ACTION_QUIET_CLS}
            >
              {t("switchWhileBusyCancel")}
            </DialogClose>
            <button
              type="button"
              onClick={confirmSwitch}
              className={cn(ACTION_PRIMARY_CLS, "h-9 rounded-lg px-3 text-sm")}
            >
              {t("switchWhileBusyConfirm")}
            </button>
          </DialogFooter>
        </DialogPopup>
      </Dialog>
    </ChatLinkProvider>
  );
}
