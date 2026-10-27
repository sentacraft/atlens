"use client";

import { useChat } from "@ai-sdk/react";
import { toast } from "sonner";
import { track } from "@/lib/analytics/analytics";
import type { PageStarter, Starter } from "@/lib/askiris/starter-questions";
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useEffectiveMount } from "@/hooks/useMountParam";
import { useScrollAffordance } from "@/hooks/useScrollAffordance";
import { useFitAboveKeyboard } from "@/hooks/useKeyboardViewport";
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
  panelReturnUrl,
  URL_CONVERSATION_LOCATION,
  type AskIrisEntry,
} from "@/lib/url/askiris";
import { usePageStarters } from "@/components/askiris/usePageStarters";
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
import { ACTION_OUTLINE_CLS, ACTION_QUIET_CLS, ACTION_PRIMARY_CLS, ICON_CLOSE_BTN_CLS, ICON_NAV_BTN_CLS } from "@/config/ui-tokens";
import { ArrowRight, History, Maximize2, Minimize2, Plus, X } from "lucide-react";
import AiTag from "@/components/iris/AiTag";
import { ConversationHistoryPopover, ConversationHistoryView } from "@/components/askiris/ConversationHistory";
import { useBreakpoint } from "@/hooks/useViewport";
import type { AskIrisUIMessage } from "@/lib/askiris/message-metadata";
import { openChat, rememberConversation, rememberedConversationId, replyingConversationId, setModelPreset } from "@/components/askiris/live-chats";
import { resolveOpening } from "@/lib/askiris/opening";

type ConversationSwitch = { kind: "select"; id: string } | { kind: "new"; reason: "manual" | "reopen" };

/** How a message came to be sent, for analytics. */
type MessageSource = { method: "typed" | "handoff" } | { method: "starter"; pool: (Starter | PageStarter)["pool"] };

const TOP_BAR_BTN_CLS = cn(ICON_NAV_BTN_CLS, "h-9 gap-1.5 px-2.5 text-sm");

const SHELL_CLS = {
  page: "mx-auto flex h-[var(--page-height)] w-full max-w-[800px] flex-col px-4",
  panel: "flex h-full w-full flex-col px-4",
  expandedPanel: "mx-auto flex h-full w-full max-w-[800px] flex-col px-4",
};

/**
 * Where the chat lives: the Ask Iris page, or the panel that follows the user across pages, beside
 * the page on wide screens (`side`) and a full-screen sheet on narrow ones; `pagePath` is the page
 * beside the panel, which picks its first example questions.
 */
export type AskIrisShell =
  | { variant: "page"; entry: AskIrisEntry; starterSeed: number }
  | {
      variant: "panel";
      layout: "side" | "sheet";
      /** Counts the panel's openings; the empty state replays its hero on each. */
      openCount: number;
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
  const openSignIn = useSignInDialog();
  const locale = useLocale();
  const mount = useEffectiveMount();
  const debug = useTestHookOption("askIrisTrace") === "on";
  const modelPreset = useTestHookOption("askIrisModel");
  useEffect(() => setModelPreset(modelPreset), [modelPreset]);
  // The Ask Iris page mounts afresh on each visit and opens as the panel reopens. Read once: a turn
  // sent here makes this page's own conversation the replying and the remembered one.
  const [pageOpening] = useState(() =>
    shell.variant === "page"
      ? resolveOpening(
          entry.conversationId
            ? { kind: "conversation", conversationId: entry.conversationId }
            : entry.question
              ? { kind: "question", text: entry.question }
              : { kind: "open" },
          { shown: null, replyingId: replyingConversationId(), lastId: rememberedConversationId() },
        )
      : null,
  );
  const [input, setInput] = useState(pageOpening?.kind === "replying" ? (pageOpening.draft ?? "") : "");
  const [historyOpen, setHistoryOpen] = useState(false);
  // From lg up Iris sits beside the page, with room for History as a popover over the chat.
  const historyAsPopover = useBreakpoint("lg");
  const [signingIn, setSigningIn] = useState(false);
  const [pendingSwitch, setPendingSwitch] = useState<ConversationSwitch | null>(null);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  // The conversation an opening left for a new one, offered back until another is picked.
  const [resumeId, setResumeId] = useState<string | null>(() =>
    pageOpening?.kind === "fresh" ? pageOpening.resumeId : null,
  );
  const pageStarters = usePageStarters(shell.variant === "panel" ? shell.pagePath : null, lenses);
  const { data: session } = authClient.useSession();
  // Guests have a session too, and their own stored conversations.
  const userId = session?.user.id;
  const isAccount = Boolean(accountUser(session));
  const conversation = useConversation({
    initialConversationId:
      pageOpening?.kind === "conversation" || pageOpening?.kind === "replying" ? pageOpening.conversationId : undefined,
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
  const hasMessages = messages.length > 0;
  useEffect(() => {
    if (hasMessages) {
      rememberConversation(conversationId);
    }
  }, [conversationId, hasMessages]);
  useTurnSync({
    conversationId,
    userId,
    busy: isBusy,
    turnFailed: status === "error",
    historyChanged: messages.at(-1)?.metadata?.historyChanged === true,
    setMessages,
    location: shell.variant === "page" ? URL_CONVERSATION_LOCATION : DETACHED_CONVERSATION_LOCATION,
  });
  const chatError = status === "error" ? classifyError(error) : null;
  const turnBody = () => ({ mount, locale });

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
    if (pageOpening?.kind === "fresh" && pageOpening.question) {
      void send(pageOpening.question, { method: "handoff" });
    }
  });
  useEffect(() => {
    if (entryHandled.current || !entry.question) {
      return;
    }
    entryHandled.current = true;
    handleEntry();
  }, [entry.question]);

  const receiveRequest = useEffectEvent((request: IrisPanelRequest) => {
    const opening = resolveOpening(request, {
      shown: { id: conversationId, hasMessages },
      replyingId: isBusy ? conversationId : undefined,
      lastId: rememberedConversationId(),
    });
    if (opening.kind === "conversation") {
      requestSwitch({ kind: "select", id: opening.conversationId });
      return;
    }
    if (opening.kind === "replying") {
      if (opening.draft) {
        setInput(opening.draft);
      }
      return;
    }
    if (opening.kind === "stay") {
      return;
    }
    if (opening.startNew) {
      switchConversation({ kind: "new", reason: "reopen" });
    }
    setResumeId(opening.resumeId);
    if (opening.question) {
      if (opening.startNew) {
        setPendingQuestion(opening.question);
      } else {
        void send(opening.question, { method: "handoff" });
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
    setResumeId(null);
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

  const shellRef = useRef<HTMLDivElement>(null);
  useFitAboveKeyboard(shellRef, shell.variant === "page");
  const shellCls =
    shell.variant === "page" ? SHELL_CLS.page : shell.expanded ? SHELL_CLS.expandedPanel : SHELL_CLS.panel;
  const shellProps = { ref: shellRef, className: shellCls };
  const historyProps = {
    conversations: conversation.conversations,
    listState: conversation.listState,
    activeConversationId: conversationId,
    onSelect: (id: string) => requestSwitch({ kind: "select", id }),
    onNew: startNewConversation,
    onRename: conversation.renameConversation,
    onDelete: conversation.deleteConversation,
    onSignIn: isAccount ? null : () => openSignIn("iris_history"),
  };
  const historyButton = (
    <button
      type="button"
      onClick={historyAsPopover ? undefined : () => setHistoryOpen(true)}
      title={t("history")}
      className={cn(ACTION_OUTLINE_CLS, "h-8 px-2.5 text-[13px] data-popup-open:bg-zinc-50")}
    >
      <History className="size-4" />
      {t("history")}
    </button>
  );
  const historyControl = historyAsPopover ? (
    <ConversationHistoryPopover {...historyProps} open={historyOpen} onOpenChange={setHistoryOpen} trigger={historyButton} />
  ) : (
    historyButton
  );
  // Only a stored conversation can be reopened; one whose first turn failed never was.
  const resumable = conversation.conversations.find((item) => item.id === resumeId);
  const resume = resumable ? (
    <button
      type="button"
      onClick={() => requestSwitch({ kind: "select", id: resumable.id })}
      className="flex w-full shrink-0 items-center justify-between gap-3 rounded-xl bg-zinc-100 px-3 py-2.5 text-left text-[13px] text-zinc-700 transition-colors hover:bg-zinc-200/70"
    >
      <span className="truncate">{t("resume", { title: resumable.title })}</span>
      <ArrowRight className="size-4 shrink-0 text-zinc-500" />
    </button>
  ) : null;
  const topBar = shell.variant === "panel" ? (
    <div className="-mx-1 flex h-12 shrink-0 items-center justify-between">
      <div className="flex min-w-0 items-center gap-1">
        <span className="inline-flex items-center gap-1.5 px-1 text-sm font-semibold text-zinc-900">
          Iris
          <AiTag />
        </span>
        {historyControl}
      </div>
      <div className="flex items-center gap-0.5">
        {messages.length > 0 && (
          <button type="button" onClick={startNewConversation} aria-label={t("newChat")} title={t("newChat")} className={cn(ICON_NAV_BTN_CLS, "h-8 w-8")}>
            <Plus className="size-4" />
          </button>
        )}
        {shell.layout === "side" && (
          <button
            type="button"
            onClick={() => shell.onExpandedChange(!shell.expanded)}
            aria-label={shell.expanded ? t("exitFullScreen") : t("fullScreen")}
            title={shell.expanded ? t("exitFullScreen") : t("fullScreen")}
            className={cn(ICON_NAV_BTN_CLS, "h-8 w-8")}
          >
            {shell.expanded ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </button>
        )}
        {shell.layout === "side" && (
          <button type="button" onClick={shell.onClose} aria-label={t("closePanel")} className={cn(ICON_CLOSE_BTN_CLS, "h-8 w-8")}>
            <X className="size-4" />
          </button>
        )}
      </div>
    </div>
  ) : (
    <div className="flex h-12 shrink-0 items-center justify-between">
      <div className="flex min-w-0 items-center gap-1">
        {historyControl}
      </div>
      {messages.length > 0 && (
        <button type="button" onClick={startNewConversation} className={TOP_BAR_BTN_CLS}>
          <Plus className="size-4" />
          {t("newChat")}
        </button>
      )}
    </div>
  );

  if (historyOpen && !historyAsPopover) {
    return (
      <div {...shellProps}>
        <ConversationHistoryView {...historyProps} onBack={() => setHistoryOpen(false)} />
      </div>
    );
  }

  if (conversation.loading) {
    return (
      <div {...shellProps}>
        {topBar}
        <div className="grid flex-1 place-items-center text-sm text-zinc-500">
          {t("loadingConversation")}
        </div>
      </div>
    );
  }

  if (renderMessages.length === 0 && !entry.question && !pendingQuestion) {
    return (
      <div {...shellProps}>
        {topBar}
        {resume}
        <AskIrisEmptyState
          variant={shell.variant === "page" ? "page" : shell.layout}
          openCount={shell.variant === "page" ? 1 : shell.openCount}
          input={input}
          onInputChange={setInput}
          onSubmit={() => void submitText(input)}
          onStarter={(starter) => void submitText(starter.text, { method: "starter", pool: starter.pool })}
          starterSeed={shell.variant === "page" ? shell.starterSeed : null}
          pageStarters={pageStarters}
          disabled={isBusy}
        />
      </div>
    );
  }

  return (
    <ChatLinkProvider targets={linkTargets}>
      <div {...shellProps}>
        {topBar}
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
              onExpand={
                shell.variant === "panel" && shell.layout === "side" && !shell.expanded
                  ? () => shell.onExpandedChange(true)
                  : undefined
              }
              cards={{
                lenses,
                answerGear: (toolCallId, output) =>
                  void addToolOutput({ tool: ASK_FOR_GEAR, toolCallId, output, options: { body: turnBody() } }),
                answerSignIn: (id, approved) =>
                  void addToolApprovalResponse({ id, approved, options: { body: turnBody() } }),
                signInReturnTo: () =>
                  shell.variant === "page" ? window.location.href : panelReturnUrl(conversationId),
              }}
            />
            {chatError && (
              <AskIrisError error={chatError} onRetry={() => regenerate({ body: turnBody() })} />
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
