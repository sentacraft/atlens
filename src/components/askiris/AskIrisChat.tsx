"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { toast } from "sonner";
import { track } from "@/lib/analytics/analytics";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useEffectiveMount } from "@/hooks/useMountParam";
import { useScrollAffordance } from "@/hooks/useScrollAffordance";
import { useTestHookEnabled, useTestHookOption } from "@/context/TestHookProvider";
import { accountUser, authClient, ensureSession } from "@/lib/auth-client";
import { askIrisChatRequestBody } from "@/lib/askiris/chat-request";
import AskIrisThread from "@/components/askiris/AskIrisThread";
import { ChatLinkProvider } from "@/components/askiris/ChatLinkContext";
import type { ChatLinkTargets } from "@/lib/askiris/inline-links";
import type { LensSummary } from "@/lib/lens/data";
import { ASK_FOR_GEAR } from "@/lib/ai/gear-request";
import { ASK_IRIS_PATH as ASK_IRIS_FULL_PATH } from "@/lib/url/routes";
import {
  askIrisConversationPath,
  clearEntryParams,
  DETACHED_CONVERSATION_LOCATION,
  URL_CONVERSATION_LOCATION,
  type AskIrisEntry,
  type IrisQuestion,
} from "@/lib/url/askiris";
import { currentPagePath } from "@/lib/askiris/page-path";
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
import { ACTION_PRIMARY_CLS, ICON_CLOSE_BTN_CLS, ICON_NAV_BTN_CLS } from "@/config/ui-tokens";
import { History, Maximize2, Plus, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import AiTag from "@/components/iris/AiTag";
import ConversationHistory from "@/components/askiris/ConversationHistory";
import {
  askIrisMessageMetadataSchema,
  type AskIrisUIMessage,
} from "@/lib/askiris/message-metadata";

const transport = new DefaultChatTransport<AskIrisUIMessage>({
  prepareSendMessagesRequest: ({ id, messages, body }) => ({
    body: askIrisChatRequestBody({ id, messages, body }),
  }),
});

type ConversationSwitch = { kind: "select"; id: string } | { kind: "new" };

const TOP_BAR_BTN_CLS = cn(ICON_NAV_BTN_CLS, "h-9 gap-1.5 px-2.5 text-sm");

const SHELL_CLS = {
  page: "mx-auto flex h-[calc(100svh-var(--nav-height)-var(--safe-inset-bottom))] w-full max-w-[800px] flex-col px-4",
  panel: "flex h-full w-full flex-col px-4",
};

/** A question handed in from outside the panel; a new `id` hands it in again. */
export interface IrisPanelRequest {
  id: number;
  question: IrisQuestion;
}

/** Where the chat lives: the Ask Iris page, or the side panel that follows the user across pages. */
export type AskIrisShell =
  | { variant: "page"; entry: AskIrisEntry }
  | { variant: "panel"; request: IrisPanelRequest | null; onClose: () => void };

const NEW_ENTRY: AskIrisEntry = { kind: "new" };

export default function AskIrisChat({
  shell,
  linkTargets,
  lenses,
}: {
  shell: AskIrisShell;
  linkTargets: ChatLinkTargets;
  lenses: LensSummary[];
}) {
  const entry = shell.variant === "page" ? shell.entry : NEW_ENTRY;
  const initialQuestion = entry.kind === "handoff" ? entry.question : undefined;
  const t = useTranslations("AskIris");
  const locale = useLocale();
  const mount = useEffectiveMount();
  const debug = useTestHookOption("askIrisTrace") === "on";
  const [input, setInput] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [pendingSwitch, setPendingSwitch] = useState<ConversationSwitch | null>(null);
  // The page a phone handoff came from: the conversation is about it until the user moves on.
  const [originPage, setOriginPage] = useState(entry.kind === "handoff" ? entry.from : undefined);
  const { data: session } = authClient.useSession();
  const userId = accountUser(session)?.id;
  const historyEnabled = useTestHookEnabled();
  const conversation = useConversation({
    initialConversationId: entry.kind === "resume" ? entry.conversationId : undefined,
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
  const { messages, sendMessage, status, setMessages, stop, regenerate, error, addToolOutput } = useChat<AskIrisUIMessage>({
    id: conversationId,
    messages: conversation.initialMessages,
    transport,
    generateId: () => crypto.randomUUID(),
    messageMetadataSchema: askIrisMessageMetadataSchema,
    experimental_throttle: 50,
    // A gear card's answer goes straight back to Iris, which carries on with the reply.
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  });
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
  // Read at send time: the panel follows the user across pages.
  const turnBody = () => {
    const page = shell.variant === "panel" ? currentPagePath() : originPage;
    return { mount, locale, ...(page ? { page } : {}) };
  };

  useEffect(() => {
    track("askiris_view");
  }, []);

  // Conversations are stored per user, so a visitor's first turn creates an anonymous one.
  async function send(text: string, method: "typed" | "handoff"): Promise<boolean> {
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
    track("askiris_message", { method });
    return true;
  }

  async function submitText(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isBusy) {
      return;
    }
    if (await send(trimmed, "typed")) {
      setInput("");
    }
  }

  // A draft, or a question that arrives while a reply is being written, waits in the input.
  const receiveQuestion = useEffectEvent((question: IrisQuestion) => {
    if (question.mode === "draft" || isBusy) {
      setInput(question.text);
    } else {
      void send(question.text, "handoff");
    }
  });

  // A ref, not a module flag: returning with a new question must hand it in again.
  const initialQuestionReceived = useRef(false);
  useEffect(() => {
    if (initialQuestionReceived.current || !initialQuestion) {
      return;
    }
    initialQuestionReceived.current = true;
    clearEntryParams();
    receiveQuestion(initialQuestion);
  }, [initialQuestion]);
  const panelRequest = shell.variant === "panel" ? shell.request : null;
  const handledRequestId = useRef(0);
  useEffect(() => {
    if (!panelRequest || panelRequest.id === handledRequestId.current) {
      return;
    }
    handledRequestId.current = panelRequest.id;
    receiveQuestion(panelRequest.question);
  }, [panelRequest]);

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
    setOriginPage(undefined);
    if (target.kind === "new") {
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
    requestSwitch({ kind: "new" });
  }

  const showHistory = shell.variant === "page" && Boolean(userId && historyEnabled);
  const topBar = shell.variant === "panel" ? (
    <div className="-mx-1 flex h-12 shrink-0 items-center justify-between">
      <span className="inline-flex items-center gap-1.5 px-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        Iris
        <AiTag />
      </span>
      <div className="flex items-center gap-0.5">
        {messages.length > 0 && (
          <button type="button" onClick={startNewConversation} aria-label={t("newChat")} title={t("newChat")} className={cn(ICON_NAV_BTN_CLS, "h-8 w-8")}>
            <Plus className="size-4" />
          </button>
        )}
        <Link
          href={messages.length > 0 ? askIrisConversationPath(conversationId) : ASK_IRIS_FULL_PATH}
          aria-label={t("fullScreen")}
          title={t("fullScreen")}
          onClick={shell.onClose}
          className={cn(ICON_NAV_BTN_CLS, "h-8 w-8")}
        >
          <Maximize2 className="size-4" />
        </Link>
        <button type="button" onClick={shell.onClose} aria-label={t("closePanel")} className={cn(ICON_CLOSE_BTN_CLS, "h-8 w-8")}>
          <X className="size-4" />
        </button>
      </div>
    </div>
  ) : (
    <div className="flex h-12 shrink-0 items-center justify-between">
      {showHistory ? (
        <button type="button" onClick={() => setHistoryOpen(true)} className={TOP_BAR_BTN_CLS}>
          <History className="size-4" />
          {t("history")}
        </button>
      ) : (
        <span />
      )}
      {messages.length > 0 && (
        <button type="button" onClick={startNewConversation} className={TOP_BAR_BTN_CLS}>
          <Plus className="size-4" />
          {t("newChat")}
        </button>
      )}
      {showHistory && (
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
        />
      )}
    </div>
  );

  if (conversation.loading) {
    return (
      <div className={SHELL_CLS[shell.variant]}>
        {topBar}
        <div className="grid flex-1 place-items-center text-sm text-zinc-500 dark:text-zinc-400">
          {t("loadingConversation")}
        </div>
      </div>
    );
  }

  if (renderMessages.length === 0 && initialQuestion?.mode !== "send") {
    return (
      <div className={SHELL_CLS[shell.variant]}>
        {topBar}
        <AskIrisEmptyState
          variant={shell.variant}
          input={input}
          onInputChange={setInput}
          onSubmit={() => void submitText(input)}
          onChip={setInput}
          disabled={isBusy}
        />
      </div>
    );
  }

  return (
    <ChatLinkProvider targets={linkTargets}>
      <div className={SHELL_CLS[shell.variant]}>
        {topBar}
        <div className="relative min-h-0 flex-1">
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="h-full space-y-4 overflow-y-auto pt-4 pr-3 pb-6 [scrollbar-width:thin] [scrollbar-color:rgb(212_212_216)_transparent] dark:[scrollbar-color:rgb(63_63_70)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-300/70 dark:[&::-webkit-scrollbar-thumb]:bg-zinc-700/70"
          >
            <AskIrisThread
              messages={renderMessages}
              debug={debug}
              busy={isBusy}
              gearCard={{
                lenses,
                onAnswer: (toolCallId, output) =>
                  void addToolOutput({ tool: ASK_FOR_GEAR, toolCallId, output, options: { body: turnBody() } }),
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
              className="h-9 rounded-lg px-3 text-sm text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
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
